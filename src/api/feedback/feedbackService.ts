import crypto from "node:crypto";
import { emailTemplateService } from "@/common/services/emailTemplateService";
import { feedbackEnv } from "@/common/utils/feedbackEnvConfig";
import { logger } from "@/common/utils/logger";
import nodemailer from "nodemailer";

interface FeedbackData {
  name: string;
  email: string;
  message: string;
  submittedAt: Date;
  username?: string;
  locale?: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

interface CaptchaChallenge {
  id: string;
  question: string;
  answer: number;
  expiresAt: number;
}

class FeedbackService {
  private transporter: nodemailer.Transporter | null = null;

  // In-memory store for captcha challenges (in production, use Redis or similar)
  private captchaChallenges: Map<string, CaptchaChallenge> = new Map();

  // Clean up expired challenges periodically
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired captchas every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredCaptchas(), 5 * 60 * 1000);
  }

  private cleanupExpiredCaptchas(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, challenge] of this.captchaChallenges.entries()) {
      if (challenge.expiresAt < now) {
        this.captchaChallenges.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug({ cleaned }, "feedbackService: Cleaned up expired captcha challenges");
    }
  }

  /**
   * Generate a new captcha challenge
   * Returns the challenge ID and question (not the answer!)
   */
  generateCaptcha(): { captchaId: string; question: string } {
    // Generate random numbers for simple math
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;

    // Generate a unique ID for this challenge
    const captchaId = crypto.randomBytes(16).toString("hex");

    const challenge: CaptchaChallenge = {
      id: captchaId,
      question: `${num1} + ${num2}`,
      answer: num1 + num2,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
    };

    this.captchaChallenges.set(captchaId, challenge);

    logger.debug({ captchaId, question: challenge.question }, "feedbackService: Generated new captcha");

    return {
      captchaId,
      question: challenge.question,
    };
  }

  /**
   * Verify a captcha answer
   * Returns true if the answer is correct and the challenge hasn't expired
   */
  verifyCaptcha(captchaId: string, answer: string): boolean {
    const challenge = this.captchaChallenges.get(captchaId);

    if (!challenge) {
      logger.warn({ captchaId }, "feedbackService: Captcha challenge not found");
      return false;
    }

    // Remove the challenge regardless of outcome (one-time use)
    this.captchaChallenges.delete(captchaId);

    // Check if expired
    if (challenge.expiresAt < Date.now()) {
      logger.warn({ captchaId }, "feedbackService: Captcha challenge expired");
      return false;
    }

    // Check the answer
    const userAnswer = Number.parseInt(answer, 10);
    const isValid = !Number.isNaN(userAnswer) && userAnswer === challenge.answer;

    if (!isValid) {
      logger.warn(
        { captchaId, expected: challenge.answer, got: userAnswer },
        "feedbackService: Invalid captcha answer",
      );
    }

    return isValid;
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      // For port 587: secure should be false, STARTTLS will be used automatically
      // For port 465: secure should be true (implicit TLS)
      const useSecure = feedbackEnv.SMTP_SECURE || feedbackEnv.SMTP_PORT === 465;

      this.transporter = nodemailer.createTransport({
        host: feedbackEnv.SMTP_HOST,
        port: feedbackEnv.SMTP_PORT,
        secure: useSecure,
        auth: {
          user: feedbackEnv.SMTP_USER,
          pass: feedbackEnv.SMTP_PASS,
        },
        // For port 587, require STARTTLS upgrade
        requireTLS: feedbackEnv.SMTP_PORT === 587,
        tls: {
          // Allow self-signed certificates in development
          rejectUnauthorized: process.env.NODE_ENV === "production",
        },
      });

      logger.debug(
        {
          host: feedbackEnv.SMTP_HOST,
          port: feedbackEnv.SMTP_PORT,
          secure: useSecure,
          requireTLS: feedbackEnv.SMTP_PORT === 587,
        },
        "feedbackService: SMTP transporter configured",
      );
    }
    return this.transporter;
  }

  async sendFeedbackEmail(data: FeedbackData): Promise<SendResult> {
    try {
      const transporter = this.getTransporter();

      // Format the date/time
      const formattedDateTime = data.submittedAt.toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "long",
      });

      // Build user info line
      const userInfo = data.username ? `Logged-in User: ${data.username}` : "User: Not logged in";

      const mailOptions = {
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: feedbackEnv.SMTP_TO_EMAIL,
        replyTo: data.email !== "Not provided" ? data.email : undefined,
        subject: `[Patient Outcome Feedback] Message from ${data.name}`,
        text: `
New feedback received from Patient Outcome application:

Submitted: ${formattedDateTime}
${userInfo}

Name: ${data.name}
Email: ${data.email}

Message:
${data.message}

---
This message was sent via the Patient Outcome feedback form.
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1976d2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #555; }
    .message { background-color: white; padding: 15px; border-left: 4px solid #1976d2; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Feedback Received</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Submitted:</span> ${formattedDateTime}
      </div>
      <div class="field">
        <span class="label">${data.username ? "Logged-in User:" : "User:"}</span> ${data.username || "Not logged in"}
      </div>
      <div class="field">
        <span class="label">Name:</span> ${data.name}
      </div>
      <div class="field">
        <span class="label">Email:</span> ${data.email}
      </div>
      <div class="message">
        <span class="label">Message:</span>
        <p>${data.message.replace(/\n/g, "<br>")}</p>
      </div>
      <div class="footer">
        <p>This message was sent via the Patient Outcome feedback form.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `.trim(),
      };

      await transporter.sendMail(mailOptions);
      logger.info({ to: feedbackEnv.SMTP_TO_EMAIL }, "feedbackService: Feedback email sent successfully");

      // Send confirmation email to the user if they provided an email address
      if (data.email && data.email !== "Not provided") {
        await this.sendConfirmationEmail(data);
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, "feedbackService: Failed to send feedback email");
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Send a confirmation email to the user who submitted feedback
   * Uses templates based on the user's locale
   */
  private async sendConfirmationEmail(data: FeedbackData): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const locale = emailTemplateService.normalizeLocale(data.locale);

      // Format the date/time according to locale
      const formattedDateTime = data.submittedAt.toLocaleString(locale === "de" ? "de-DE" : "en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });

      // Prepare template variables
      const variables = {
        name: data.name !== "Anonymous" ? data.name : locale === "de" ? "Benutzer" : "User",
        message: data.message.replace(/\n/g, "<br>"),
        submittedAt: formattedDateTime,
        year: new Date().getFullYear(),
        salutation: locale === "de" ? "Sehr geehrte/r" : "Dear",
      };

      // Render the template
      const rendered = emailTemplateService.render("feedback-confirmation", locale, variables);

      // For the text version, we don't want HTML line breaks
      const textVariables = { ...variables, message: data.message };
      const renderedText = emailTemplateService.render("feedback-confirmation", locale, textVariables);

      const confirmationMailOptions = {
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: data.email,
        subject: rendered.subject,
        text: renderedText.text,
        html: rendered.html,
      };

      await transporter.sendMail(confirmationMailOptions);
      logger.info({ to: data.email, locale }, "feedbackService: Confirmation email sent successfully");
    } catch (error) {
      // Log the error but don't fail the main feedback submission
      logger.error({ error, email: data.email }, "feedbackService: Failed to send confirmation email");
    }
  }
}

export const feedbackService = new FeedbackService();
