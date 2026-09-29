import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

/**
 * A stored Web Push subscription.
 *
 * A subscription is either:
 *  - linked to an authenticated user (admin/clinician) via `userId`, or
 *  - linked to an anonymous case-code session via `caseAccessToken` (patient push).
 *
 * Both fields are optional so that either use-case can be stored, but at least
 * one must be present (enforced at the service layer).
 */
export const PushSubscriptionSchema = z.object({
  _id: zId().optional(),
  /** Authenticated user owning this subscription (admin/clinician channel). */
  userId: zId("User").optional().nullable(),
  /** Patient owning the linked case, if known. */
  patientId: zId("Patient").optional().nullable(),
  /** Case owning the linked access token, if known. */
  caseId: zId("PatientCase").optional().nullable(),
  /** Consultation owning the linked access token, if known. */
  consultationId: zId("Consultation").optional().nullable(),
  /**
   * Signed, short-lived token representing a case-access-code session
   * (patient channel). Scoped to a specific case-access-code so that
   * multiple active codes per case work independently.
   */
  caseAccessToken: z.string().optional().nullable(),
  /** The raw PushSubscription JSON from the browser (endpoint + keys). */
  endpoint: z.string(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
  /** User-agent hint for debugging ("Chrome/Android", "Chrome/Desktop", …). */
  userAgent: z.string().optional().nullable(),
  /** When this subscription was registered. */
  createdAt: z.date().optional(),
  /** Last successful push delivery. Null until first delivery. */
  lastDeliveredAt: z.date().optional().nullable(),
  /** Consecutive delivery failures (reset on success). */
  failureCount: z.number().int().min(0).default(0),
  /** Subscription is soft-disabled (e.g. browser unsubscribed / 410 Gone). */
  archivedAt: z.date().optional().nullable(),
});

export type PushSubscriptionDoc = z.infer<typeof PushSubscriptionSchema>;

const MongoosePushSubscriptionSchema = zodSchema(PushSubscriptionSchema.omit({ _id: true }));

// Unique index: one subscription per endpoint prevents duplicate registrations.
MongoosePushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
MongoosePushSubscriptionSchema.index({ userId: 1 });
MongoosePushSubscriptionSchema.index({ caseAccessToken: 1 });
MongoosePushSubscriptionSchema.index({ caseId: 1 });
MongoosePushSubscriptionSchema.index({ patientId: 1 });
MongoosePushSubscriptionSchema.index({ consultationId: 1 });

export const PushSubscriptionModel = mongoose.model(
  "PushSubscription",
  MongoosePushSubscriptionSchema,
  "push_subscriptions",
);
