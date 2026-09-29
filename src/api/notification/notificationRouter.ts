import express, { type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "@/server";
import { notificationService } from "@/api/notification/notificationService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import {
  clearPatientNotificationContact,
  getNotificationAdminStatus,
  getPatientNotificationContact,
  resolveNotificationScopeFromAccessToken,
  sendManualNotification,
  unsubscribePatientNotificationEmailByToken,
  upsertPatientNotificationContact,
} from "@/api/notification/notificationAdminService";
import { env } from "@/common/utils/envConfig";

const router = express.Router();

function hasNotificationAdminAccess(req: Request): boolean {
  const roles = req.session?.roles ?? [];
  return roles.includes("admin") || roles.includes("developer");
}

/**
 * GET /notifications/vapid-public-key
 *
 * Returns the VAPID public key so the frontend can create a push subscription.
 * Public endpoint — no authentication required.
 */
router.get("/vapid-public-key", (_req: Request, res: Response) => {
  const key = notificationService.getVapidPublicKey();
  if (!key) {
    res.status(503).json({ message: "Push notifications not configured on this server." });
    return;
  }
  res.json({ vapidPublicKey: key });
});

const SubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
  /**
   * For patient (case-code) sessions provide caseAccessToken.
   * For authenticated admin sessions the userId is taken from req.session.
   */
  caseAccessToken: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

/**
 * POST /notifications/subscribe
 *
 * Register or update a push subscription.
 * - Authenticated users: subscription is bound to session userId.
 * - Case-code patients: caseAccessToken must be provided in the body.
 *
 * Upserts on `endpoint` to avoid duplicates on repeated re-registration.
 */
router.post("/subscribe", async (req: Request, res: Response) => {
  const parsed = SubscribeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid subscription payload", errors: parsed.error.flatten() });
    return;
  }

  const { endpoint, keys, caseAccessToken, userAgent } = parsed.data;

  // Resolve identity: authenticated user OR patient token
  const userId = (req as any).session?.userId as string | undefined;
  if (!userId && !caseAccessToken) {
    res.status(401).json({ message: "Authentication or caseAccessToken required to subscribe." });
    return;
  }

  try {
    const resolvedScope = caseAccessToken
      ? await resolveNotificationScopeFromAccessToken(caseAccessToken)
      : { patientId: null, caseId: null, consultationId: null };

    await PushSubscriptionModel.updateOne(
      { endpoint },
      {
        $set: {
          endpoint,
          keys,
          userAgent: userAgent ?? null,
          userId: userId ?? null,
          patientId: resolvedScope.patientId,
          caseId: resolvedScope.caseId,
          consultationId: resolvedScope.consultationId,
          caseAccessToken: caseAccessToken ?? null,
          archivedAt: null,
          failureCount: 0,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    logger.info({ endpoint, userId, caseAccessToken }, "Push subscription registered");
    res.status(201).json({ message: "Subscribed" });
  } catch (error) {
    logger.error({ error }, "Failed to save push subscription");
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

const PatientContactSchema = z.object({
  caseAccessToken: z.string().min(1),
  email: z.string().email(),
  futureConsultationReminders: z.boolean(),
});

router.get("/patient-contact/:caseAccessToken", async (req: Request, res: Response) => {
  try {
    const result = await getPatientNotificationContact(req.params.caseAccessToken);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Failed to resolve patient notification contact");
    res.status(404).json({ message: "Notification contact not found for this access token." });
  }
});

router.post("/patient-contact", async (req: Request, res: Response) => {
  const parsed = PatientContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid notification contact payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await upsertPatientNotificationContact(parsed.data.caseAccessToken, {
      email: parsed.data.email,
      futureConsultationReminders: parsed.data.futureConsultationReminders,
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, "Failed to save patient notification contact");
    res.status(404).json({ message: "Failed to save notification contact for this access token." });
  }
});

router.delete("/patient-contact/:caseAccessToken", async (req: Request, res: Response) => {
  try {
    await clearPatientNotificationContact(req.params.caseAccessToken);
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Failed to clear patient notification contact");
    res.status(404).json({ message: "Failed to clear notification contact for this access token." });
  }
});

router.get("/email/unsubscribe/:token", async (req: Request, res: Response) => {
  const unsubscribed = await unsubscribePatientNotificationEmailByToken(req.params.token);
  res
    .status(unsubscribed ? 200 : 404)
    .type("html")
    .send(unsubscribed
      ? "<html><body><h1>Notifications disabled</h1><p>Your email has been removed from future consultation reminders.</p></body></html>"
      : "<html><body><h1>Link expired</h1><p>This unsubscribe link is invalid or has already been used.</p></body></html>");
});

const AdminStatusQuerySchema = z.object({
  patientId: z.string().optional(),
  caseId: z.string().optional(),
  consultationId: z.string().optional(),
});

router.get("/admin/status", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!hasNotificationAdminAccess(req)) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  const parsed = AdminStatusQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid notification status query", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await getNotificationAdminStatus(parsed.data);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Failed to load notification admin status");
    res.status(400).json({ message: error instanceof Error ? error.message : "Failed to load notification status." });
  }
});

const AdminSendBodySchema = z.object({
  consultationId: z.string().min(1),
  type: z.enum(["consultation_window_opened", "consultation_day_reminder"]),
});

router.post("/admin/send", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!hasNotificationAdminAccess(req)) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  const parsed = AdminSendBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid notification send payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await sendManualNotification(parsed.data.consultationId, parsed.data.type);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Failed to send manual notification");
    res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send notification." });
  }
});

/**
 * DELETE /notifications/subscribe
 *
 * Unsubscribe (soft-archive) a push subscription identified by endpoint.
 */
router.delete("/subscribe", async (req: Request, res: Response) => {
  const endpoint = req.body?.endpoint as string | undefined;
  if (!endpoint) {
    res.status(400).json({ message: "endpoint is required" });
    return;
  }

  try {
    await PushSubscriptionModel.updateOne({ endpoint }, { $set: { archivedAt: new Date() } });
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Failed to unsubscribe push endpoint");
    res.status(500).json({ message: "Failed to unsubscribe" });
  }
});

const TestPushBodySchema = z.object({
  endpoint: z.string().url(),
  title: z.string().optional(),
  body: z.string().optional(),
  url: z.string().url().optional(),
  tag: z.string().optional(),
});

router.post("/test", async (req: Request, res: Response) => {
  if (env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Route not found" });
    return;
  }

  const parsed = TestPushBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid test push payload", errors: parsed.error.flatten() });
    return;
  }

  try {
    const result = await notificationService.sendDevelopmentTestPush(parsed.data);

    if (result === "not-found") {
      res.status(404).json({ message: "No active push subscription found for this browser." });
      return;
    }

    if (result === "unconfigured") {
      res.status(503).json({ message: "Push notifications are not configured on this server." });
      return;
    }

    res.json({ message: "Test push notification sent." });
  } catch (error) {
    logger.error({ error }, "Failed to send development test push notification");
    res.status(500).json({ message: "Failed to send test push notification" });
  }
});

export const notificationRouter = router;
