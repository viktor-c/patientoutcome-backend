import dotenv from "dotenv";
import { bool, cleanEnv, str } from "envalid";

dotenv.config();

/**
 * Environment configuration for notifications (email + web push).
 * Safe defaults let the service start without crashing in development.
 * In production all VAPID_* vars and NOTIFICATION_ADMIN_EMAILS must be set.
 */
export const notificationEnv = cleanEnv(process.env, {
  /**
   * Base URL of the frontend app, used to build deep-links in email/push
   * e.g. https://app.example.com
   */
  FRONTEND_URL: str({ default: "http://localhost:5173", desc: "Frontend base URL for deep-links" }),

  /**
   * VAPID public key (base64url) — generate with `web-push generate-vapid-keys`.
   * Sent to the browser during push subscription registration.
   */
  VAPID_PUBLIC_KEY: str({ default: "", desc: "VAPID public key (base64url)" }),

  /**
   * VAPID private key (base64url) — keep secret.
   */
  VAPID_PRIVATE_KEY: str({ default: "", desc: "VAPID private key (base64url)" }),

  /**
   * VAPID subject — a mailto: or https: URL identifying the push sender.
   */
  VAPID_SUBJECT: str({ default: "mailto:admin@example.com", desc: "VAPID subject URI" }),

  /**
   * Whether to actually send notifications (true) or only log (false).
   * Useful to disable in staging/test without removing the code.
   */
  NOTIFICATIONS_ENABLED: bool({ default: true, desc: "Master toggle for sending notifications" }),

  /**
   * Comma-separated list of additional admin email addresses to always notify
   * on form completion, in addition to case supervisors.
   * e.g. "admin@hospital.de,manager@hospital.de"
   */
  NOTIFICATION_ADMIN_EMAILS: str({ default: "", desc: "Extra admin recipients for form-completion emails" }),
});
