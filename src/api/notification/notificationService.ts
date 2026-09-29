import nodemailer from "nodemailer";
import webpush from "web-push";
import { logger } from "@/server";
import { feedbackEnv } from "@/common/utils/feedbackEnvConfig";
import { notificationEnv } from "@/common/utils/notificationEnvConfig";
import { emailTemplateService } from "@/common/services/emailTemplateService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import type { NotificationEvent, NotificationChannel, PushTarget } from "@/api/notification/notificationTypes";

export interface NotificationDeliveryStats {
  attempted: number;
  succeeded: number;
  failed: number;
}

export interface PatientNotificationDispatchSummary {
  email: NotificationDeliveryStats;
  push: NotificationDeliveryStats;
}

export interface NotificationSchedulerRunSummary {
  jobName: string;
  schedule: string;
  startedAt: Date;
  finishedAt: Date;
  consultationsFound: number;
  consultationsWithTargets: number;
  consultationsMarkedNotified: number;
  consultationsSkipped: number;
  processingFailures: number;
  emailTargetsRequested: number;
  pushTargetsRequested: number;
  email: NotificationDeliveryStats;
  push: NotificationDeliveryStats;
  failureDetails: string[];
}

function emptyDeliveryStats(): NotificationDeliveryStats {
  return { attempted: 0, succeeded: 0, failed: 0 };
}

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

    const allEmails = this.getAdminEmailRecipients(recipientEmails);

    const promises: Promise<void>[] = [];

    if (channels.includes("email") && allEmails.length > 0) {
      promises.push(this.sendAdminFormCompletedEmail(event, allEmails));
    }

    if (channels.includes("push") && adminUserIds.length > 0) {
      promises.push(this.sendAdminFormCompletedPush(event, adminUserIds));
    }

    await Promise.allSettled(promises);
  }

  async sendSchedulerRunSummary(summary: NotificationSchedulerRunSummary): Promise<void> {
    if (!notificationEnv.NOTIFICATIONS_ENABLED) {
      logger.debug({ summary }, "notificationService: notifications disabled, skipping scheduler summary");
      return;
    }

    const recipients = this.getAdminEmailRecipients();
    if (recipients.length === 0) {
      logger.debug({ summary }, "notificationService: no admin recipients configured for scheduler summary");
      return;
    }

    const failureLines = summary.failureDetails.length > 0
      ? summary.failureDetails.map((detail) => `- ${detail}`).join("\n")
      : "- none";
    const escapedFailureLines = summary.failureDetails.length > 0
      ? summary.failureDetails.map((detail) => `<li>${this.escapeHtml(detail)}</li>`).join("")
      : "<li>none</li>";

    const subject = `Notification scheduler summary: ${summary.jobName} - Patient Outcome`;
    const text = [
      `Notification scheduler summary for ${summary.jobName}`,
      "",
      `Schedule: ${summary.schedule}`,
      `Started at: ${summary.startedAt.toISOString()}`,
      `Finished at: ${summary.finishedAt.toISOString()}`,
      `Consultations found: ${summary.consultationsFound}`,
      `Consultations with targets: ${summary.consultationsWithTargets}`,
      `Consultations marked notified: ${summary.consultationsMarkedNotified}`,
      `Consultations skipped: ${summary.consultationsSkipped}`,
      `Processing failures: ${summary.processingFailures}`,
      `Email targets requested: ${summary.emailTargetsRequested}`,
      `Email delivery: attempted=${summary.email.attempted}, succeeded=${summary.email.succeeded}, failed=${summary.email.failed}`,
      `Push targets requested: ${summary.pushTargetsRequested}`,
      `Push delivery: attempted=${summary.push.attempted}, succeeded=${summary.push.succeeded}, failed=${summary.push.failed}`,
      "",
      "Failure details:",
      failureLines,
    ].join("\n");
    const html = `
      <h2>Notification scheduler summary</h2>
      <p><strong>Job:</strong> ${this.escapeHtml(summary.jobName)}</p>
      <p><strong>Schedule:</strong> ${this.escapeHtml(summary.schedule)}</p>
      <ul>
        <li><strong>Started at:</strong> ${this.escapeHtml(summary.startedAt.toISOString())}</li>
        <li><strong>Finished at:</strong> ${this.escapeHtml(summary.finishedAt.toISOString())}</li>
        <li><strong>Consultations found:</strong> ${summary.consultationsFound}</li>
        <li><strong>Consultations with targets:</strong> ${summary.consultationsWithTargets}</li>
        <li><strong>Consultations marked notified:</strong> ${summary.consultationsMarkedNotified}</li>
        <li><strong>Consultations skipped:</strong> ${summary.consultationsSkipped}</li>
        <li><strong>Processing failures:</strong> ${summary.processingFailures}</li>
        <li><strong>Email targets requested:</strong> ${summary.emailTargetsRequested}</li>
        <li><strong>Email delivery:</strong> attempted=${summary.email.attempted}, succeeded=${summary.email.succeeded}, failed=${summary.email.failed}</li>
        <li><strong>Push targets requested:</strong> ${summary.pushTargetsRequested}</li>
        <li><strong>Push delivery:</strong> attempted=${summary.push.attempted}, succeeded=${summary.push.succeeded}, failed=${summary.push.failed}</li>
      </ul>
      <h3>Failure details</h3>
      <ul>${escapedFailureLines}</ul>
    `;

    try {
      await this.getTransporter().sendMail({
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: recipients.join(", "),
        subject,
        text,
        html,
      });

      logger.info(
        { summary, recipients },
        "notificationService: scheduler summary email sent",
      );
    } catch (error) {
      logger.error({ error, summary }, "notificationService: failed to send scheduler summary email");
    }
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
    unsubscribeToken: string | null = null,
  ): Promise<PatientNotificationDispatchSummary> {
    if (!notificationEnv.NOTIFICATIONS_ENABLED) {
      return {
        email: emptyDeliveryStats(),
        push: emptyDeliveryStats(),
      };
    }

    const emailPromise = channels.includes("email") && patientEmail
      ? this.sendPatientWindowEmail(event, patientEmail, caseAccessToken, unsubscribeToken)
      : Promise.resolve(emptyDeliveryStats());

    const pushPromise = channels.includes("push") && caseAccessToken
      ? this.sendPatientWindowPush(event, caseAccessToken)
      : Promise.resolve(emptyDeliveryStats());

    const [email, push] = await Promise.all([emailPromise, pushPromise]);

    return { email, push };
  }

  async sendDevelopmentTestPush(target: {
    endpoint: string;
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  }): Promise<"sent" | "not-found" | "unconfigured"> {
    if (!this.vapidConfigured) {
      return "unconfigured";
    }

    const subscription = await PushSubscriptionModel.findOne({
      endpoint: target.endpoint,
      archivedAt: null,
    }).lean();

    if (!subscription) {
      return "not-found";
    }

    const payload = JSON.stringify({
      title: target.title ?? "Test notification",
      body: target.body ?? "Development test push from Patient Outcome.",
      url: target.url ?? notificationEnv.FRONTEND_URL,
      tag: target.tag ?? "dev-test-push",
    });

    await this.sendPushToSubscriptions([
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    ], payload);

    return "sent";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Email helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getAdminEmailRecipients(recipientEmails: string[] = []): string[] {
    const extraEmails = notificationEnv.NOTIFICATION_ADMIN_EMAILS
      ? notificationEnv.NOTIFICATION_ADMIN_EMAILS.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    return [...new Set([...recipientEmails, ...extraEmails])];
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

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
    caseAccessToken: string | null,
    unsubscribeToken: string | null,
  ): Promise<NotificationDeliveryStats> {
    try {
      const locale = event.locale ?? "de";
      const templateName =
        event.type === "consultation_window_opened"
          ? "consultation-window-opened"
          : "consultation-day-reminder";

      const codeUrl = caseAccessToken
        ? `${notificationEnv.FRONTEND_URL.replace(/\/$/, "")}/flow/${encodeURIComponent(caseAccessToken)}`
        : `${notificationEnv.FRONTEND_URL.replace(/\/$/, "")}/flow`;
      const closingDate = event.windowClosesAt
        ? event.windowClosesAt.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB")
        : "";
      const unsubscribeUrl = unsubscribeToken
        ? `${notificationEnv.BACKEND_URL.replace(/\/$/, "")}/notifications/email/unsubscribe/${encodeURIComponent(unsubscribeToken)}`
        : notificationEnv.BACKEND_URL;

      const rendered = emailTemplateService.render(templateName as any, locale, {
        caseId: event.caseId,
        consultationId: event.consultationId,
        codeUrl,
        closingDate,
        unsubscribeUrl,
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

      return { attempted: 1, succeeded: 1, failed: 0 };
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send patient window email");

      return { attempted: 1, succeeded: 0, failed: 1 };
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
    const deepLinkUrl = `${notificationEnv.FRONTEND_URL.replace(/\/$/, "")}/flow`;
    const isOpening = event.type === "consultation_window_opened";
    return JSON.stringify({
      title: isOpening ? "Fragebogen verfugbar" : "Termin heute",
      body: isOpening
        ? "Sie können jetzt Ihren Fragebogen ausfüllen."
        : "Ihr Termin ist heute. Offnen Sie den Link und fullen Sie Ihren Fragebogen aus.",
      url: deepLinkUrl,
      tag: `patient-window-${event.consultationId}-${event.type}`,
    });
  }

  private async sendPushToSubscriptions(
    targets: PushTarget[],
    payload: string,
  ): Promise<NotificationDeliveryStats> {
    if (!this.vapidConfigured) {
      logger.warn("notificationService: VAPID not configured, skipping push");
      return {
        attempted: targets.length,
        succeeded: 0,
        failed: targets.length,
      };
    }

    const result: NotificationDeliveryStats = {
      attempted: targets.length,
      succeeded: 0,
      failed: 0,
    };

    for (const target of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: target.keys },
          payload,
        );
        result.succeeded += 1;
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

        result.failed += 1;
      }
    }

    return result;
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
  ): Promise<NotificationDeliveryStats> {
    try {
      const subscriptions = await PushSubscriptionModel.find({
        caseAccessToken,
        archivedAt: null,
      }).lean();

      if (subscriptions.length === 0) return emptyDeliveryStats();

      const payload = JSON.stringify({
        ...JSON.parse(this.buildPatientPushPayload(event)),
        url: `${notificationEnv.FRONTEND_URL.replace(/\/$/, "")}/flow/${encodeURIComponent(caseAccessToken)}`,
      });
      const targets: PushTarget[] = subscriptions.map((s) => ({
        endpoint: s.endpoint,
        keys: s.keys,
      }));

      const result = await this.sendPushToSubscriptions(targets, payload);

      logger.info(
        { event, count: targets.length },
        "notificationService: patient push notifications sent",
      );

      return result;
    } catch (error) {
      logger.error({ error, event }, "notificationService: failed to send patient push");

      return { attempted: 1, succeeded: 0, failed: 1 };
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
