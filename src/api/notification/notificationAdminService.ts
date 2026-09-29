import { randomUUID } from "node:crypto";
import { consultationModel } from "@/api/consultation/consultationModel";
import { PatientCaseModel, type PatientCaseNotificationContact } from "@/api/case/patientCaseModel";
import { codeModel } from "@/api/code/codeModel";
import { notificationService } from "@/api/notification/notificationService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import { resolvePatientNotificationTargets } from "@/api/notification/notificationScheduler";

export type NotificationAdminEventType = "consultation_window_opened" | "consultation_day_reminder";

export interface NotificationAdminScopeInput {
  patientId?: string;
  caseId?: string;
  consultationId?: string;
}

interface CaseNotificationContactSummary {
  caseId: string;
  patientId: string;
  email: string | null;
  futureConsultationReminders: boolean;
  consentedAt: string | null;
  unsubscribedAt: string | null;
}

interface NotificationStatusItem {
  consultationId: string;
  caseId: string;
  patientId: string;
  consultationDate: string | null;
  type: NotificationAdminEventType;
  dueAt?: string | null;
  sentAt?: string | null;
  source: "scheduled" | "manual";
  channels: {
    email: boolean;
    push: boolean;
  };
}

interface PushSubscriptionSummary {
  endpoint: string;
  userAgent: string | null;
  createdAt: string | null;
  archivedAt: string | null;
  lastDeliveredAt: string | null;
  failureCount: number;
  patientId: string | null;
  caseId: string | null;
  consultationId: string | null;
}

export interface NotificationAdminStatusResponse {
  scope: {
    patientId: string | null;
    caseId: string | null;
    consultationId: string | null;
  };
  summary: {
    activePushSubscriptionCount: number;
    activeEmailSubscriptionCount: number;
    activeEmailRecipients: string[];
  };
  emailContacts: CaseNotificationContactSummary[];
  pushSubscriptions: PushSubscriptionSummary[];
  upcomingNotifications: NotificationStatusItem[];
  recentNotifications: NotificationStatusItem[];
}

export interface PatientNotificationContactResponse {
  caseId: string;
  patientId: string;
  email: string | null;
  futureConsultationReminders: boolean;
  subscribed: boolean;
  consentedAt: string | null;
  unsubscribedAt: string | null;
}

export interface ManualNotificationSendResponse {
  consultationId: string;
  caseId: string;
  email: { attempted: number; succeeded: number; failed: number };
  push: { attempted: number; succeeded: number; failed: number };
  sentAt: string;
  type: NotificationAdminEventType;
}

interface NotificationCaseRecord {
  _id: { toString(): string } | string;
  patient?: { toString(): string } | string;
  notificationContact?: PatientCaseNotificationContact;
}

interface NotificationConsultationRecord {
  _id: { toString(): string } | string;
  patientCaseId: { toString(): string } | string;
  dateAndTime?: string | Date;
  consultationAccessActiveFrom?: string | Date;
  consultationAccessActiveUntil?: string | Date;
  notificationTracking?: {
    windowOpenNotifiedAt?: string | Date;
    consultationDayNotifiedAt?: string | Date;
    windowOpenManualSentAt?: string | Date;
    consultationDayManualSentAt?: string | Date;
  };
}

interface ScopeResolution {
  patientIds: string[];
  caseIds: string[];
  consultations: NotificationConsultationRecord[];
  caseMap: Map<string, NotificationCaseRecord>;
}

function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return null;
}

function toIsoString(value: string | Date | undefined | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isActiveEmailContact(contact?: PatientCaseNotificationContact): contact is PatientCaseNotificationContact {
  return Boolean(
    contact?.email
    && contact.futureConsultationReminders
    && !contact.unsubscribedAt,
  );
}

function isWithinNextDays(value: string | Date | undefined, days: number): boolean {
  if (!value) return false;
  const dueAt = new Date(value).getTime();
  if (Number.isNaN(dueAt)) return false;
  const now = Date.now();
  const max = now + days * 24 * 60 * 60 * 1000;
  return dueAt >= now && dueAt <= max;
}

function isWithinPastDays(value: string | Date | undefined, days: number): boolean {
  if (!value) return false;
  const sentAt = new Date(value).getTime();
  if (Number.isNaN(sentAt)) return false;
  const now = Date.now();
  const min = now - days * 24 * 60 * 60 * 1000;
  return sentAt >= min && sentAt <= now;
}

async function resolveScope(input: NotificationAdminScopeInput): Promise<ScopeResolution> {
  const { patientId, caseId, consultationId } = input;

  const caseFilter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (caseId) caseFilter._id = caseId;
  if (patientId) caseFilter.patient = patientId;

  let consultations: NotificationConsultationRecord[] = [];
  let cases: NotificationCaseRecord[] = [];

  if (consultationId) {
    consultations = await consultationModel.find({ _id: consultationId, deletedAt: { $exists: false } }).lean() as NotificationConsultationRecord[];
    const consultationCaseIds = consultations
      .map((consultation) => toIdString(consultation.patientCaseId))
      .filter((value): value is string => Boolean(value));
    cases = consultationCaseIds.length > 0
      ? await PatientCaseModel.find({ _id: { $in: consultationCaseIds }, ...caseFilter }).lean() as NotificationCaseRecord[]
      : [];
  } else {
    cases = await PatientCaseModel.find(caseFilter).lean() as NotificationCaseRecord[];
    const caseIds = cases
      .map((patientCase) => toIdString(patientCase._id))
      .filter((value): value is string => Boolean(value));
    consultations = caseIds.length > 0
      ? await consultationModel.find({ patientCaseId: { $in: caseIds }, deletedAt: { $exists: false } }).lean() as NotificationConsultationRecord[]
      : [];
  }

  const caseMap = new Map(
    cases
      .map((patientCase) => {
        const id = toIdString(patientCase._id);
        return id ? [id, patientCase] as const : null;
      })
      .filter((entry): entry is readonly [string, NotificationCaseRecord] => entry !== null),
  );

  const filteredConsultations = consultations.filter((consultation) => {
    const currentCaseId = toIdString(consultation.patientCaseId);
    return currentCaseId ? caseMap.has(currentCaseId) : false;
  });
  const resolvedCaseIds = [...caseMap.keys()];
  const patientIds = [...new Set(
    cases
      .map((patientCase) => toIdString(patientCase.patient))
      .filter((value): value is string => Boolean(value)),
  )];

  return {
    patientIds,
    caseIds: resolvedCaseIds,
    consultations: filteredConsultations,
    caseMap,
  };
}

export async function getNotificationAdminStatus(
  input: NotificationAdminScopeInput,
): Promise<NotificationAdminStatusResponse> {
  const scope = await resolveScope(input);
  const codes = scope.caseIds.length > 0
    ? await codeModel.find({
      archivedOn: { $exists: false },
      patientCaseId: { $in: scope.caseIds },
    }).select("code patientCaseId consultationId").lean() as Array<{
      code?: string;
      patientCaseId?: { toString(): string } | string;
      consultationId?: { toString(): string } | string;
    }>
    : [];

  const activeTokens = codes
    .map((code) => code.code)
    .filter((value): value is string => Boolean(value));
  const pushSubscriptionsRaw = activeTokens.length > 0 || scope.caseIds.length > 0 || scope.patientIds.length > 0
    ? await PushSubscriptionModel.find({
      archivedAt: null,
      $or: [
        ...(activeTokens.length > 0 ? [{ caseAccessToken: { $in: activeTokens } }] : []),
        ...(scope.caseIds.length > 0 ? [{ caseId: { $in: scope.caseIds } }] : []),
        ...(scope.patientIds.length > 0 ? [{ patientId: { $in: scope.patientIds } }] : []),
        ...(input.consultationId ? [{ consultationId: input.consultationId }] : []),
      ],
    }).lean() as Array<{
      endpoint: string;
      userAgent?: string | null;
      createdAt?: string | Date;
      archivedAt?: string | Date | null;
      lastDeliveredAt?: string | Date | null;
      failureCount?: number;
      patientId?: { toString(): string } | string | null;
      caseId?: { toString(): string } | string | null;
      consultationId?: { toString(): string } | string | null;
    }>
    : [];

  const dedupedPushSubscriptions = [...new Map(
    pushSubscriptionsRaw.map((subscription) => [subscription.endpoint, subscription]),
  ).values()];

  const pushSubscriptions: PushSubscriptionSummary[] = dedupedPushSubscriptions.map((subscription) => ({
    endpoint: subscription.endpoint,
    userAgent: subscription.userAgent ?? null,
    createdAt: toIsoString(subscription.createdAt ?? null),
    archivedAt: toIsoString(subscription.archivedAt ?? null),
    lastDeliveredAt: toIsoString(subscription.lastDeliveredAt ?? null),
    failureCount: subscription.failureCount ?? 0,
    patientId: toIdString(subscription.patientId),
    caseId: toIdString(subscription.caseId),
    consultationId: toIdString(subscription.consultationId),
  }));

  const emailContacts = scope.caseIds
    .map((caseId) => {
      const patientCase = scope.caseMap.get(caseId);
      const patientId = patientCase ? toIdString(patientCase.patient) : null;
      if (!patientCase || !patientId) return null;

      return {
        caseId,
        patientId,
        email: patientCase.notificationContact?.email ?? null,
        futureConsultationReminders: Boolean(patientCase.notificationContact?.futureConsultationReminders),
        consentedAt: toIsoString(patientCase.notificationContact?.consentedAt ?? null),
        unsubscribedAt: toIsoString(patientCase.notificationContact?.unsubscribedAt ?? null),
      } satisfies CaseNotificationContactSummary;
    })
    .filter((value): value is CaseNotificationContactSummary => value !== null);

  const pushCaseIds = new Set(pushSubscriptions.map((subscription) => subscription.caseId).filter((value): value is string => Boolean(value)));
  const upcomingNotifications: NotificationStatusItem[] = [];
  const recentNotifications: NotificationStatusItem[] = [];

  for (const consultation of scope.consultations) {
    const consultationId = toIdString(consultation._id);
    const currentCaseId = toIdString(consultation.patientCaseId);
    const patientCase = currentCaseId ? scope.caseMap.get(currentCaseId) : undefined;
    const patientId = patientCase ? toIdString(patientCase.patient) : null;
    if (!consultationId || !currentCaseId || !patientId) continue;

    const emailActive = isActiveEmailContact(patientCase?.notificationContact);
    const pushActive = pushCaseIds.has(currentCaseId) || activeTokens.length > 0;
    const tracking = consultation.notificationTracking;

    if (isWithinNextDays(consultation.consultationAccessActiveFrom, 7) && !tracking?.windowOpenNotifiedAt) {
      upcomingNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_window_opened",
        dueAt: toIsoString(consultation.consultationAccessActiveFrom),
        source: "scheduled",
        channels: { email: emailActive, push: pushActive },
      });
    }

    if (isWithinNextDays(consultation.dateAndTime, 7) && !tracking?.consultationDayNotifiedAt) {
      upcomingNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_day_reminder",
        dueAt: toIsoString(consultation.dateAndTime),
        source: "scheduled",
        channels: { email: emailActive, push: pushActive },
      });
    }

    if (isWithinPastDays(tracking?.windowOpenNotifiedAt, 14)) {
      recentNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_window_opened",
        sentAt: toIsoString(tracking?.windowOpenNotifiedAt),
        source: "scheduled",
        channels: { email: emailActive, push: pushActive },
      });
    }

    if (isWithinPastDays(tracking?.consultationDayNotifiedAt, 14)) {
      recentNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_day_reminder",
        sentAt: toIsoString(tracking?.consultationDayNotifiedAt),
        source: "scheduled",
        channels: { email: emailActive, push: pushActive },
      });
    }

    if (isWithinPastDays(tracking?.windowOpenManualSentAt, 14)) {
      recentNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_window_opened",
        sentAt: toIsoString(tracking?.windowOpenManualSentAt),
        source: "manual",
        channels: { email: emailActive, push: pushActive },
      });
    }

    if (isWithinPastDays(tracking?.consultationDayManualSentAt, 14)) {
      recentNotifications.push({
        consultationId,
        caseId: currentCaseId,
        patientId,
        consultationDate: toIsoString(consultation.dateAndTime),
        type: "consultation_day_reminder",
        sentAt: toIsoString(tracking?.consultationDayManualSentAt),
        source: "manual",
        channels: { email: emailActive, push: pushActive },
      });
    }
  }

  const activeEmailRecipients = emailContacts
    .filter((contact) => contact.email && contact.futureConsultationReminders && !contact.unsubscribedAt)
    .map((contact) => contact.email as string);

  return {
    scope: {
      patientId: input.patientId ?? (scope.patientIds.length === 1 ? scope.patientIds[0] : null),
      caseId: input.caseId ?? (scope.caseIds.length === 1 ? scope.caseIds[0] : null),
      consultationId: input.consultationId ?? (scope.consultations.length === 1 ? toIdString(scope.consultations[0]?._id) : null),
    },
    summary: {
      activePushSubscriptionCount: pushSubscriptions.length,
      activeEmailSubscriptionCount: activeEmailRecipients.length,
      activeEmailRecipients,
    },
    emailContacts,
    pushSubscriptions,
    upcomingNotifications,
    recentNotifications,
  };
}

function buildManualSentField(type: NotificationAdminEventType):
  | "notificationTracking.windowOpenManualSentAt"
  | "notificationTracking.consultationDayManualSentAt" {
  return type === "consultation_window_opened"
    ? "notificationTracking.windowOpenManualSentAt"
    : "notificationTracking.consultationDayManualSentAt";
}

export async function sendManualNotification(
  consultationId: string,
  type: NotificationAdminEventType,
): Promise<ManualNotificationSendResponse> {
  const consultation = await consultationModel.findById(consultationId).lean() as NotificationConsultationRecord | null;
  if (!consultation) {
    throw new Error("Consultation not found.");
  }

  const caseId = toIdString(consultation.patientCaseId);
  if (!caseId) {
    throw new Error("Consultation is missing a linked case.");
  }

  const { patientEmail, caseAccessTokens, unsubscribeToken } = await resolvePatientNotificationTargets(consultationId, caseId);
  const event = type === "consultation_window_opened"
    ? {
      type,
      consultationId,
      caseId,
      windowClosesAt: consultation.consultationAccessActiveUntil
        ? new Date(consultation.consultationAccessActiveUntil)
        : undefined,
    }
    : {
      type,
      consultationId,
      caseId,
    };

  const emailToken = caseAccessTokens[0] ?? null;
  const email = patientEmail
    ? (await notificationService.notifyPatient(event, patientEmail, emailToken, ["email"], unsubscribeToken)).email
    : { attempted: 0, succeeded: 0, failed: 0 };

  const pushTotals = { attempted: 0, succeeded: 0, failed: 0 };
  for (const caseAccessToken of caseAccessTokens) {
    const result = await notificationService.notifyPatient(event, null, caseAccessToken, ["push"], unsubscribeToken);
    pushTotals.attempted += result.push.attempted;
    pushTotals.succeeded += result.push.succeeded;
    pushTotals.failed += result.push.failed;
  }

  const sentAt = new Date();
  await consultationModel.updateOne(
    { _id: consultationId },
    { $set: { [buildManualSentField(type)]: sentAt } },
  );

  return {
    consultationId,
    caseId,
    type,
    sentAt: sentAt.toISOString(),
    email,
    push: pushTotals,
  };
}

async function findPatientCaseByAccessToken(caseAccessToken: string): Promise<NotificationCaseRecord | null> {
  const code = await codeModel.findOne({ code: caseAccessToken, archivedOn: { $exists: false } })
    .select("patientCaseId")
    .lean() as { patientCaseId?: { toString(): string } | string } | null;
  const caseId = toIdString(code?.patientCaseId);
  if (!caseId) {
    return null;
  }

  return await PatientCaseModel.findById(caseId).select("patient notificationContact").lean() as NotificationCaseRecord | null;
}

function ensureUnsubscribeToken(contact?: PatientCaseNotificationContact): string {
  return contact?.unsubscribeToken ?? randomUUID();
}

export async function upsertPatientNotificationContact(
  caseAccessToken: string,
  payload: { email: string; futureConsultationReminders: boolean },
): Promise<PatientNotificationContactResponse> {
  const patientCase = await findPatientCaseByAccessToken(caseAccessToken);
  const caseId = toIdString(patientCase?._id);
  const patientId = toIdString(patientCase?.patient);
  if (!patientCase || !caseId || !patientId) {
    throw new Error("No patient case found for the provided access token.");
  }

  const now = new Date();
  const notificationContact: PatientCaseNotificationContact = {
    email: payload.email,
    futureConsultationReminders: payload.futureConsultationReminders,
    consentedAt: payload.futureConsultationReminders ? now : patientCase.notificationContact?.consentedAt ?? null,
    unsubscribedAt: null,
    unsubscribeToken: ensureUnsubscribeToken(patientCase.notificationContact),
  };

  await PatientCaseModel.updateOne({ _id: caseId }, { $set: { notificationContact } });

  return {
    caseId,
    patientId,
    email: notificationContact.email ?? null,
    futureConsultationReminders: Boolean(notificationContact.futureConsultationReminders),
    subscribed: Boolean(notificationContact.email && notificationContact.futureConsultationReminders),
    consentedAt: toIsoString(notificationContact.consentedAt ?? null),
    unsubscribedAt: toIsoString(notificationContact.unsubscribedAt ?? null),
  };
}

export async function getPatientNotificationContact(
  caseAccessToken: string,
): Promise<PatientNotificationContactResponse> {
  const patientCase = await findPatientCaseByAccessToken(caseAccessToken);
  const caseId = toIdString(patientCase?._id);
  const patientId = toIdString(patientCase?.patient);
  if (!patientCase || !caseId || !patientId) {
    throw new Error("No patient case found for the provided access token.");
  }

  return {
    caseId,
    patientId,
    email: patientCase.notificationContact?.email ?? null,
    futureConsultationReminders: Boolean(patientCase.notificationContact?.futureConsultationReminders),
    subscribed: isActiveEmailContact(patientCase.notificationContact),
    consentedAt: toIsoString(patientCase.notificationContact?.consentedAt ?? null),
    unsubscribedAt: toIsoString(patientCase.notificationContact?.unsubscribedAt ?? null),
  };
}

export async function clearPatientNotificationContact(caseAccessToken: string): Promise<void> {
  const patientCase = await findPatientCaseByAccessToken(caseAccessToken);
  const caseId = toIdString(patientCase?._id);
  if (!patientCase || !caseId) {
    throw new Error("No patient case found for the provided access token.");
  }

  const now = new Date();
  await PatientCaseModel.updateOne(
    { _id: caseId },
    {
      $set: {
        "notificationContact.email": null,
        "notificationContact.futureConsultationReminders": false,
        "notificationContact.unsubscribedAt": now,
        "notificationContact.unsubscribeToken": ensureUnsubscribeToken(patientCase.notificationContact),
      },
      $unset: { "notificationContact.consentedAt": "" },
    },
  );
}

export async function unsubscribePatientNotificationEmailByToken(token: string): Promise<boolean> {
  const patientCase = await PatientCaseModel.findOne({ "notificationContact.unsubscribeToken": token })
    .select("notificationContact")
    .lean() as NotificationCaseRecord | null;
  const caseId = toIdString(patientCase?._id);
  if (!patientCase || !caseId) {
    return false;
  }

  await PatientCaseModel.updateOne(
    { _id: caseId },
    {
      $set: {
        "notificationContact.email": null,
        "notificationContact.futureConsultationReminders": false,
        "notificationContact.unsubscribedAt": new Date(),
      },
      $unset: { "notificationContact.consentedAt": "" },
    },
  );

  return true;
}

export async function resolveNotificationScopeFromAccessToken(
  caseAccessToken: string,
): Promise<{ patientId: string | null; caseId: string | null; consultationId: string | null }> {
  const code = await codeModel.findOne({ code: caseAccessToken, archivedOn: { $exists: false } })
    .select("patientCaseId consultationId")
    .lean() as {
      patientCaseId?: { toString(): string } | string;
      consultationId?: { toString(): string } | string;
    } | null;
  const caseId = toIdString(code?.patientCaseId);
  const consultationId = toIdString(code?.consultationId);
  if (!caseId) {
    return { patientId: null, caseId: null, consultationId };
  }

  const patientCase = await PatientCaseModel.findById(caseId).select("patient").lean() as NotificationCaseRecord | null;
  return {
    patientId: toIdString(patientCase?.patient),
    caseId,
    consultationId,
  };
}