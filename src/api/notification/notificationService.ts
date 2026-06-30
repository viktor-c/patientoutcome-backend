import nodemailer from "nodemailer";
import webpush from "web-push";
import { logger } from "@/server";
import { feedbackEnv } from "@/common/utils/feedbackEnvConfig";
import { notificationEnv } from "@/common/utils/notificationEnvConfig";
import { emailTemplateService } from "@/common/services/emailTemplateService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import type { NotificationEvent, NotificationChannel, PushTarget } from "@/api/notification/notificationTypes";

/**
 * NotificationService — central hub for sending event-driven notifications.
 *
 * Supported channels:
 *  - Email (via existing SMTP / nodemailer infrastructure)
 *  - Browser push (Web Push / VAPID)
 *
 * Two recipient types:
 *  - Admin/clinician: resolved by userId; receives form-completion events.
 *  - Patient (case-code session): resolved by caseAccessToken; receives
 *    window-opened and window-closing-soon events.
 *
 * All delivery failures are logged but never throw – a notification failure
 * must never break the primary form-submission flow.
 */
class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private vapidConfigured = false;

  constructor() {
    this.configureVapid();
  }

  private configureVapid(): void {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = notificationEnv;
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      this.vapidConfigured = true;
      logger.info("notificationService: VAPID configured");
    } else {
      logger.warn("notificationService: VAPID keys not set — browser push is disabled");
    }
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const useSecure = feedbackEnv.SMTP_SECURE || feedbackEnv.SMTP_PORT === 465;
      this.transporter = nodemailer.createTransport({
        host: feedbackEnv.SMTP_HOST,
        port: feedbackEnv.SMTP_PORT,
        secure: useSecure,
        auth: { user: feedbackEnv.SMTP_USER, pass: feedbackEnv.SMTP_PASS },
        requireTLS: feedbackEnv.SMTP_PORT === 587,
        tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
      });
    }
    return this.transporter;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Notify admin/clinician recipients about a completed form.
   * Recipients = case supervisors + extra addresses from NOTIFICATION_ADMIN_EMAILS env.
   *
   * @param event  NotificationEvent of type "form_completed"
   * @param recipientEmails  Resolved email addresses of admin recipients
   * @param channels         Which channels to use (defaults to ["email", "push"])
   * @param adminUserIds     User IDs for push subscription lookup
   */
  async notifyAdmins(
    event: NotificationEvent,
    recipientEmails: string[],
    channels: NotificationChannel[] = ["email", "push"],
    adminUserIds: string[] = [],
  ): Promise<void> {
    if (!notificationEnv.NOTIFICATIONS_ENABLED) {
      logger.debug({ event }, "notificationService: notifications disabled, skipping");
      return;
    }

    const extraEmails = notificationEnv.NOTIFICATION_ADMIN_EMAILS
      ? notificationEnv.NOTIFICATION_ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
      : [];
    const allEmails = [...new Set([...recipientEmails, ...extraEmails])];

    const promises: Promise<void>[] = [];

    if (channels.includes("email") && allEmails.length > 0) {
      promises.push(this.sendAdminFormCompletedEmail(event, allEmails));
    }

    if (channels.includes("push") && adminUserIds.length > 0) {
      promises.push(this.sendAdminFormCompletedPush(event, adminUserIds));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Notify a patient (identified by caseAccessToken) that a consultation
   * window has opened or is closing soon.
   *
   * @param event            NotificationEvent of type window_opened / window_closing_soon
   * @param patientEmail     Email address of the patient (optional)
   * @param caseAccessToken  Token linking the patient push subscription
   * @param channels         Which channels to use
   */
  async notifyPatient(
    event: NotificationEvent,
    patientEmail: string | null,
    caseAccessToken: string | null,
    channels: NotificationChannel[] = ["email", "push"],
  ): Promise<void> {
    if (!notificationEnv.NOTIFICATIONS_ENABLED) return;

    const promises: Promise<void>[] = [];

    if (channels.includes("email") && patientEmail) {
      promises.push(this.sendPatientWindowEmail(event, patientEmail));
    }

    if (channels.includes("push") && caseAccessToken) {
      promises.push(this.sendPatientWindowPush(event, caseAccessToken));
    }

    await Promise.allSettled(promises);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Email helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async sendAdminFormCompletedEmail(
    event: NotificationEvent,
    recipients: string[],
  ): Promise<void> {
    try {
      const locale = event.locale ?? "de";
      const caseUrl = `${notificationEnv.FRONTEND_URL}/case/${event.caseId}?highlightConsultation=${event.consultationId}`;

      const rendered = emailTemplateService.render("form-completed", locale, {
        formTemplateName: event.formTemplateName ?? "Form",
        caseUrl,
        caseId: event.caseId,
        consultationId: event.consultationId,
      });

      await this.getTransporter().sendMail({
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: recipients.join(", "),
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      logger.info(
        { event, recipients },
        "notificationService: admin form-completed email sent",
      );
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send admin form-completed email");
    }
  }

  private async sendPatientWindowEmail(
    event: NotificationEvent,
    patientEmail: string,
  ): Promise<void> {
    try {
      const locale = event.locale ?? "de";
      const templateName =
        event.type === "consultation_window_opened"
          ? "consultation-window-opened"
          : "consultation-window-closing";

      const codeUrl = `${notificationEnv.FRONTEND_URL}/flow`;
      const closingDate = event.windowClosesAt
        ? event.windowClosesAt.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB")
        : "";

      const rendered = emailTemplateService.render(templateName as any, locale, {
        caseId: event.caseId,
        consultationId: event.consultationId,
        codeUrl,
        closingDate,
      });

      await this.getTransporter().sendMail({
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: patientEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      logger.info(
        { event, patientEmail },
        "notificationService: patient window email sent",
      );
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send patient window email");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Push helpers
  // ─────────────────────────────────────────────────────────────────────────

  private buildAdminPushPayload(event: NotificationEvent): string {
    const caseUrl = `${notificationEnv.FRONTEND_URL}/case/${event.caseId}?highlightConsultation=${event.consultationId}`;
    return JSON.stringify({
      title: "Form completed",
      body: `${event.formTemplateName ?? "A form"} has been filled out.`,
      url: caseUrl,
      tag: `form-completed-${event.formId}`,
    });
  }

  private buildPatientPushPayload(event: NotificationEvent): string {
    const closing = event.windowClosesAt
      ? event.windowClosesAt.toLocaleDateString("de-DE")
      : "";
    const isOpening = event.type === "consultation_window_opened";
    return JSON.stringify({
      title: isOpening ? "Fragebogen verfügbar" : "Fragebogen läuft ab",
      body: isOpening
        ? "Sie können jetzt Ihren Fragebogen ausfüllen."
        : `Ihr Fragebogen läuft am ${closing} ab.`,
      url: `${notificationEnv.FRONTEND_URL}/flow`,
      tag: `patient-window-${event.consultationId}-${event.type}`,
    });
  }

  private async sendPushToSubscriptions(
    targets: PushTarget[],
    payload: string,
  ): Promise<void> {
    if (!this.vapidConfigured) {
      logger.warn("notificationService: VAPID not configured, skipping push");
      return;
    }

    for (const target of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: target.keys },
          payload,
        );
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired; mark it archived
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          logger.info({ endpoint: target.endpoint }, "notificationService: push subscription gone, archiving");
          await PushSubscriptionModel.updateOne(
            { endpoint: target.endpoint },
            { $set: { archivedAt: new Date() } },
          ).catch((dbErr) => logger.error({ dbErr }, "notificationService: failed to archive expired subscription"));
        } else {
          logger.error({ err, endpoint: target.endpoint }, "notificationService: push send failed");
          await PushSubscriptionModel.updateOne(
            { endpoint: target.endpoint },
            { $inc: { failureCount: 1 } },
          ).catch(() => undefined);
        }
      }
    }
  }

  private async sendAdminFormCompletedPush(
    event: NotificationEvent,
    adminUserIds: string[],
  ): Promise<void> {
    try {
      const subscriptions = await PushSubscriptionModel.find({
        userId: { $in: adminUserIds },
        archivedAt: null,
      }).lean();

      if (subscriptions.length === 0) return;

      const payload = this.buildAdminPushPayload(event);
      const targets: PushTarget[] = subscriptions.map((s) => ({
        endpoint: s.endpoint,
        keys: s.keys,
      }));

      await this.sendPushToSubscriptions(targets, payload);

      logger.info(
        { event, count: targets.length },
        "notificationService: admin push notifications sent",
      );
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send admin push notifications");
    }
  }

  private async sendPatientWindowPush(
    event: NotificationEvent,
    caseAccessToken: string,
  ): Promise<void> {
    try {
      const subscriptions = await PushSubscriptionModel.find({
        caseAccessToken,
        archivedAt: null,
      }).lean();

      if (subscriptions.length === 0) return;

      const payload = this.buildPatientPushPayload(event);
      const targets: PushTarget[] = subscriptions.map((s) => ({
        endpoint: s.endpoint,
        keys: s.keys,
      }));

      await this.sendPushToSubscriptions(targets, payload);

      logger.info(
        { event, count: targets.length },
        "notificationService: patient push notifications sent",
      );
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send patient push");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VAPID public key endpoint helper
  // ─────────────────────────────────────────────────────────────────────────

  /** Return the VAPID public key for the frontend to use during subscription. */
  getVapidPublicKey(): string {
    return notificationEnv.VAPID_PUBLIC_KEY;
  }
}

export const notificationService = new NotificationService();
