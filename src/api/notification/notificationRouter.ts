import express, { type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "@/server";
import { notificationService } from "@/api/notification/notificationService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import { env } from "@/common/utils/envConfig";

const router = express.Router();

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
    await PushSubscriptionModel.updateOne(
      { endpoint },
      {
        $set: {
          endpoint,
          keys,
          userAgent: userAgent ?? null,
          userId: userId ?? null,
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
