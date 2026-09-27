import cron from "node-cron";
import { logger } from "@/common/utils/logger";
import { notificationService } from "@/api/notification/notificationService";

let windowOpenJob: ReturnType<typeof cron.schedule> | null = null;
let consultationDayJob: ReturnType<typeof cron.schedule> | null = null;

interface PatientNotificationTargets {
  patientEmail: string | null;
  caseAccessTokens: string[];
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
    .lean() as { notificationContact?: { email?: string } } | null;

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
    patientEmail: patientCase?.notificationContact?.email ?? null,
    caseAccessTokens,
  };
}

export function initializeNotificationScheduler(): void {
  if (windowOpenJob || consultationDayJob) {
    logger.warn("notificationScheduler: already initialized, skipping");
    return;
  }

  // Job 1: window-open detector — fires at 08:00 daily
  windowOpenJob = cron.schedule("0 8 * * *", async () => {
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

      logger.info({ count: consultations.length }, "notificationScheduler: window-open candidates");

      for (const consultation of consultations) {
        try {
          const caseId = consultation.patientCaseId?.toString() ?? "";
          if (!caseId) continue;

          const { patientEmail, caseAccessTokens } = await resolvePatientNotificationTargets(
            consultation._id.toString(),
            caseId,
          );

          if (!patientEmail && caseAccessTokens.length === 0) continue;

          const event = {
            type: "consultation_window_opened" as const,
            consultationId: consultation._id.toString(),
            caseId,
            windowClosesAt: consultation.consultationAccessActiveUntil
              ? new Date(consultation.consultationAccessActiveUntil)
              : undefined,
          };

          if (patientEmail) {
            await notificationService.notifyPatient(event, patientEmail, null, ["email"]);
          }

          for (const caseAccessToken of caseAccessTokens) {
            await notificationService.notifyPatient(event, null, caseAccessToken, ["push"]);
          }

          await (consultationModel as any).updateOne(
            { _id: consultation._id },
            { $set: { "notificationTracking.windowOpenNotifiedAt": new Date() } },
          );
        } catch (err) {
          logger.error({ err, consultationId: consultation._id }, "notificationScheduler: window-open error");
        }
      }
    } catch (error) {
      logger.error({ error }, "notificationScheduler: window-open job failed");
    }
  });

  // Job 2: consultation-day reminder — fires at 08:00 daily
  consultationDayJob = cron.schedule("0 8 * * *", async () => {
    logger.info("notificationScheduler: running consultation-day reminder");
    try {
      const { consultationModel } = await import("@/api/consultation/consultationModel.js");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const consultations = await (consultationModel as any).find({
        dateAndTime: { $gte: startOfDay, $lte: endOfDay },
        "notificationTracking.consultationDayNotifiedAt": { $exists: false },
        deletedAt: { $exists: false },
      }).lean() as any[];

      logger.info({ count: consultations.length }, "notificationScheduler: consultation-day candidates");

      for (const consultation of consultations) {
        try {
          const caseId = consultation.patientCaseId?.toString() ?? "";
          if (!caseId) continue;

          const { patientEmail, caseAccessTokens } = await resolvePatientNotificationTargets(
            consultation._id.toString(),
            caseId,
          );

          if (!patientEmail && caseAccessTokens.length === 0) continue;

          const event = {
            type: "consultation_day_reminder" as const,
            consultationId: consultation._id.toString(),
            caseId,
          };

          if (patientEmail) {
            await notificationService.notifyPatient(event, patientEmail, null, ["email"]);
          }

          for (const caseAccessToken of caseAccessTokens) {
            await notificationService.notifyPatient(event, null, caseAccessToken, ["push"]);
          }

          await (consultationModel as any).updateOne(
            { _id: consultation._id },
            { $set: { "notificationTracking.consultationDayNotifiedAt": new Date() } },
          );
        } catch (err) {
          logger.error({ err, consultationId: consultation._id }, "notificationScheduler: consultation-day error");
        }
      }
    } catch (error) {
      logger.error({ error }, "notificationScheduler: consultation-day job failed");
    }
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
