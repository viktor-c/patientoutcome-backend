/**
 * Notification event types recognised by the NotificationService.
 */
export type NotificationEventType =
  | "form_completed"
  | "consultation_window_opened"
  | "consultation_day_reminder";

/**
 * Notification delivery channels.
 */
export type NotificationChannel = "email" | "push";

/**
 * A self-contained notification event describing what happened and
 * who should be informed via which channels.
 */
export interface NotificationEvent {
  type: NotificationEventType;

  /** The form that was completed (only for form_completed). */
  formId?: string;
  /** The consultation the event concerns. */
  consultationId: string;
  /** The patient case the consultation belongs to. */
  caseId: string;
  /** Human-readable form template name (for email body). */
  formTemplateName?: string;
  /** When the consultation access window closes (for reminder emails). */
  windowClosesAt?: Date;

  /** Preferred locale for email templates ("en" | "de"). Defaults to "de". */
  locale?: "en" | "de";
}

/**
 * The subset of a PushSubscription required to send a push message.
 */
export interface PushTarget {
  endpoint: string;
  keys: { auth: string; p256dh: string };
}
