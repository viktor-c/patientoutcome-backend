import cron from "node-cron";
import { logger } from "@/common/utils/logger";
import {
  notificationService,
  type NotificationDeliveryStats,
  type NotificationSchedulerRunSummary,
} from "@/api/notification/notificationService";

let windowOpenJob: ReturnType<typeof cron.schedule> | null = null;
let consultationDayJob: ReturnType<typeof cron.schedule> | null = null;

interface PatientNotificationTargets {
  patientEmail: string | null;
  caseAccessTokens: string[];
  unsubscribeToken: string | null;
}

function emptyDeliveryStats(): NotificationDeliveryStats {
  return { attempted: 0, succeeded: 0, failed: 0 };
}

function createRunSummary(jobName: string): NotificationSchedulerRunSummary {
  const startedAt = new Date();

  return {
    jobName,
    schedule: "0 8 * * *",
    startedAt,
    finishedAt: startedAt,
    consultationsFound: 0,
    consultationsWithTargets: 0,
    consultationsMarkedNotified: 0,
    consultationsSkipped: 0,
    processingFailures: 0,
    emailTargetsRequested: 0,
    pushTargetsRequested: 0,
    email: emptyDeliveryStats(),
    push: emptyDeliveryStats(),
    failureDetails: [],
  };
}

function addDeliveryStats(target: NotificationDeliveryStats, source: NotificationDeliveryStats): void {
  target.attempted += source.attempted;
  target.succeeded += source.succeeded;
  target.failed += source.failed;
}

function addFailureDetail(summary: NotificationSchedulerRunSummary, detail: string): void {
  if (summary.failureDetails.length < 25) {
    summary.failureDetails.push(detail);
  }
}

export async function resolvePatientNotificationTargets(
  consultationId: string,
  caseId: string,
): Promise<PatientNotificationTargets> {
  const [{ PatientCaseModel }, { codeModel }] = await Promise.all([
    import("@/api/case/patientCaseModel.js"),
    import("@/api/code/codeModel.js"),
  ]);

  const patientCase = await (PatientCaseModel as any).findById(caseId)
    .select("notificationContact")
    .lean() as {
    notificationContact?: {
      email?: string;
      futureConsultationReminders?: boolean;
      unsubscribeToken?: string;
      unsubscribedAt?: string | Date;
    };
  } | null;

  const now = Date.now();
  const accessCodes = await (codeModel as any).find({
    archivedOn: { $exists: false },
    activatedOn: { $exists: true, $ne: null },
    $or: [
      { consultationId },
      { patientCaseId: caseId },
    ],
  })
    .select("code activatedOn validFrom validUntil expiresOn")
    .lean() as Array<{
      code?: string;
      activatedOn?: string | Date;
      validFrom?: string | Date;
      validUntil?: string | Date;
      expiresOn?: string | Date;
    }>;

  const caseAccessTokens = [...new Set(accessCodes
    .filter((candidate) => {
      if (!candidate.code) return false;

      const activeFrom = candidate.activatedOn ?? candidate.validFrom;
      if (activeFrom && new Date(activeFrom).getTime() > now) {
        return false;
      }

      const activeUntil = candidate.expiresOn ?? candidate.validUntil;
      if (activeUntil && new Date(activeUntil).getTime() < now) {
        return false;
      }

      return true;
    })
    .map((candidate) => candidate.code as string))];

  return {
    patientEmail: patientCase?.notificationContact?.email
      && patientCase.notificationContact.futureConsultationReminders
      && !patientCase.notificationContact.unsubscribedAt
      ? patientCase.notificationContact.email
      : null,
    caseAccessTokens,
    unsubscribeToken: patientCase?.notificationContact?.unsubscribeToken ?? null,
  };
}

export async function runConsultationDayReminderJob(referenceNow: Date = new Date()): Promise<void> {
  const summary = createRunSummary("consultation-day reminder");

  logger.info("notificationScheduler: running consultation-day reminder");
  try {
    const { consultationModel } = await import("@/api/consultation/consultationModel.js");

    const startOfDay = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 0, 0, 0);
    const endOfDay = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 23, 59, 59);

    const consultations = await (consultationModel as any).find({
      dateAndTime: { $gte: startOfDay, $lte: endOfDay },
      "notificationTracking.consultationDayNotifiedAt": { $exists: false },
      deletedAt: { $exists: false },
    }).lean() as any[];
    summary.consultationsFound = consultations.length;

    logger.info({ count: consultations.length }, "notificationScheduler: consultation-day candidates");

    for (const consultation of consultations) {
      try {
        const consultationId = consultation._id?.toString() ?? "unknown";
        const caseId = consultation.patientCaseId?.toString() ?? "";
        if (!caseId) {
          summary.consultationsSkipped += 1;
          addFailureDetail(summary, `Skipped consultation ${consultationId}: missing case ID`);
          continue;
        }

        const { patientEmail, caseAccessTokens, unsubscribeToken } = await resolvePatientNotificationTargets(
          consultationId,
          caseId,
        );

        if (!patientEmail && caseAccessTokens.length === 0) {
          summary.consultationsSkipped += 1;
          addFailureDetail(summary, `Skipped consultation ${consultationId}: no email or active access codes`);
          continue;
        }

        summary.consultationsWithTargets += 1;

        const event = {
          type: "consultation_day_reminder" as const,
          consultationId,
          caseId,
        };

        if (patientEmail) {
          summary.emailTargetsRequested += 1;
          const result = await notificationService.notifyPatient(event, patientEmail, caseAccessTokens[0] ?? null, ["email"], unsubscribeToken);
          addDeliveryStats(summary.email, result.email);
        }

        for (const caseAccessToken of caseAccessTokens) {
          summary.pushTargetsRequested += 1;
          const result = await notificationService.notifyPatient(event, null, caseAccessToken, ["push"]);
          addDeliveryStats(summary.push, result.push);
        }

        await (consultationModel as any).updateOne(
          { _id: consultation._id },
          { $set: { "notificationTracking.consultationDayNotifiedAt": new Date() } },
        );
        summary.consultationsMarkedNotified += 1;
      } catch (err) {
        summary.processingFailures += 1;
        addFailureDetail(
          summary,
          `Failed consultation ${consultation._id?.toString?.() ?? "unknown"}: ${err instanceof Error ? err.message : String(err)}`,
        );
        logger.error({ err, consultationId: consultation._id }, "notificationScheduler: consultation-day error");
      }
    }
  } catch (error) {
    summary.processingFailures += 1;
    addFailureDetail(summary, `Job failure: ${error instanceof Error ? error.message : String(error)}`);
    logger.error({ error }, "notificationScheduler: consultation-day job failed");
  } finally {
    summary.finishedAt = new Date();
    await notificationService.sendSchedulerRunSummary(summary);
  }
}

export function initializeNotificationScheduler(): void {
  if (windowOpenJob || consultationDayJob) {
    logger.warn("notificationScheduler: already initialized, skipping");
    return;
  }

  // Job 1: window-open detector — fires at 08:00 daily
  windowOpenJob = cron.schedule("0 8 * * *", async () => {
    const summary = createRunSummary("window-open detector");

    logger.info("notificationScheduler: running window-open detector");
    try {
      const { consultationModel } = await import("@/api/consultation/consultationModel.js");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const consultations = await (consultationModel as any).find({
        consultationAccessActiveFrom: { $gte: startOfDay, $lte: endOfDay },
        "notificationTracking.windowOpenNotifiedAt": { $exists: false },
        deletedAt: { $exists: false },
      }).lean() as any[];
      summary.consultationsFound = consultations.length;

      logger.info({ count: consultations.length }, "notificationScheduler: window-open candidates");

      for (const consultation of consultations) {
        try {
          const consultationId = consultation._id?.toString() ?? "unknown";
          const caseId = consultation.patientCaseId?.toString() ?? "";
          if (!caseId) {
            summary.consultationsSkipped += 1;
            addFailureDetail(summary, `Skipped consultation ${consultationId}: missing case ID`);
            continue;
          }

          const { patientEmail, caseAccessTokens, unsubscribeToken } = await resolvePatientNotificationTargets(
            consultationId,
            caseId,
          );

          if (!patientEmail && caseAccessTokens.length === 0) {
            summary.consultationsSkipped += 1;
            addFailureDetail(summary, `Skipped consultation ${consultationId}: no email or active access codes`);
            continue;
          }

          summary.consultationsWithTargets += 1;

          const event = {
            type: "consultation_window_opened" as const,
            consultationId,
            caseId,
            windowClosesAt: consultation.consultationAccessActiveUntil
              ? new Date(consultation.consultationAccessActiveUntil)
              : undefined,
          };

          if (patientEmail) {
            summary.emailTargetsRequested += 1;
            const result = await notificationService.notifyPatient(event, patientEmail, caseAccessTokens[0] ?? null, ["email"], unsubscribeToken);
            addDeliveryStats(summary.email, result.email);
          }

          for (const caseAccessToken of caseAccessTokens) {
            summary.pushTargetsRequested += 1;
            const result = await notificationService.notifyPatient(event, null, caseAccessToken, ["push"]);
            addDeliveryStats(summary.push, result.push);
          }

          await (consultationModel as any).updateOne(
            { _id: consultation._id },
            { $set: { "notificationTracking.windowOpenNotifiedAt": new Date() } },
          );
          summary.consultationsMarkedNotified += 1;
        } catch (err) {
          summary.processingFailures += 1;
          addFailureDetail(
            summary,
            `Failed consultation ${consultation._id?.toString?.() ?? "unknown"}: ${err instanceof Error ? err.message : String(err)}`,
          );
          logger.error({ err, consultationId: consultation._id }, "notificationScheduler: window-open error");
        }
      }
    } catch (error) {
      summary.processingFailures += 1;
      addFailureDetail(summary, `Job failure: ${error instanceof Error ? error.message : String(error)}`);
      logger.error({ error }, "notificationScheduler: window-open job failed");
    } finally {
      summary.finishedAt = new Date();
      await notificationService.sendSchedulerRunSummary(summary);
    }
  });

  // Job 2: consultation-day reminder — fires at 08:00 daily
  consultationDayJob = cron.schedule("0 8 * * *", async () => {
    await runConsultationDayReminderJob();
  });

  logger.info("notificationScheduler: initialized (08:00 daily)");
}

export function shutdownNotificationScheduler(): void {
  windowOpenJob?.stop();
  consultationDayJob?.stop();
  windowOpenJob = null;
  consultationDayJob = null;
  logger.info("notificationScheduler: shut down");
}
