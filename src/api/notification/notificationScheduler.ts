import cron from "node-cron";
import { logger } from "@/common/utils/logger";
import { notificationService } from "@/api/notification/notificationService";

let windowOpenJob: ReturnType<typeof cron.schedule> | null = null;
let closingSoonJob: ReturnType<typeof cron.schedule> | null = null;

export function initializeNotificationScheduler(): void {
  if (windowOpenJob || closingSoonJob) {
    logger.warn("notificationScheduler: already initialized, skipping");
    return;
  }

  // Job 1: window-open detector — fires at 08:00 daily
  windowOpenJob = cron.schedule("0 8 * * *", async () => {
    logger.info("notificationScheduler: running window-open detector");
    try {
      const { consultationModel } = await import("@/api/consultation/consultationModel.js");
      const { PatientCaseModel } = await import("@/api/case/patientCaseModel.js");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

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

          const patientCase = await (PatientCaseModel as any).findById(caseId)
            .select("notificationContact")
            .lean() as { notificationContact?: { email?: string; caseAccessToken?: string } } | null;

          const patientEmail     = patientCase?.notificationContact?.email ?? null;
          const caseAccessToken  = patientCase?.notificationContact?.caseAccessToken ?? null;

          if (!patientEmail && !caseAccessToken) continue;

          await notificationService.notifyPatient(
            {
              type: "consultation_window_opened",
              consultationId: consultation._id.toString(),
              caseId,
              windowClosesAt: consultation.consultationAccessActiveUntil
                ? new Date(consultation.consultationAccessActiveUntil)
                : undefined,
            },
            patientEmail,
            caseAccessToken,
          );

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

  // Job 2: closing-soon reminder — fires at 08:00 daily
  closingSoonJob = cron.schedule("0 8 * * *", async () => {
    logger.info("notificationScheduler: running closing-soon reminder");
    try {
      const { consultationModel } = await import("@/api/consultation/consultationModel.js");
      const { PatientCaseModel } = await import("@/api/case/patientCaseModel.js");

      const now  = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const consultations = await (consultationModel as any).find({
        consultationAccessActiveUntil: { $gte: in24h, $lt: in48h },
        "notificationTracking.closingSoonNotifiedAt": { $exists: false },
        deletedAt: { $exists: false },
      }).lean() as any[];

      logger.info({ count: consultations.length }, "notificationScheduler: closing-soon candidates");

      for (const consultation of consultations) {
        try {
          const caseId = consultation.patientCaseId?.toString() ?? "";
          if (!caseId) continue;

          const patientCase = await (PatientCaseModel as any).findById(caseId)
            .select("notificationContact")
            .lean() as { notificationContact?: { email?: string; caseAccessToken?: string } } | null;

          const patientEmail    = patientCase?.notificationContact?.email ?? null;
          const caseAccessToken = patientCase?.notificationContact?.caseAccessToken ?? null;

          if (!patientEmail && !caseAccessToken) continue;

          await notificationService.notifyPatient(
            {
              type: "consultation_window_closing_soon",
              consultationId: consultation._id.toString(),
              caseId,
              windowClosesAt: new Date(consultation.consultationAccessActiveUntil),
            },
            patientEmail,
            caseAccessToken,
          );

          await (consultationModel as any).updateOne(
            { _id: consultation._id },
            { $set: { "notificationTracking.closingSoonNotifiedAt": new Date() } },
          );
        } catch (err) {
          logger.error({ err, consultationId: consultation._id }, "notificationScheduler: closing-soon error");
        }
      }
    } catch (error) {
      logger.error({ error }, "notificationScheduler: closing-soon job failed");
    }
  });

  logger.info("notificationScheduler: initialized (08:00 daily)");
}

export function shutdownNotificationScheduler(): void {
  windowOpenJob?.stop();
  closingSoonJob?.stop();
  windowOpenJob  = null;
  closingSoonJob = null;
  logger.info("notificationScheduler: shut down");
}
