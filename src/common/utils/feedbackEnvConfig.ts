import dotenv from "dotenv";
import { bool, cleanEnv, num, str } from "envalid";

dotenv.config();

// Separate env config for feedback/email settings to avoid breaking existing env validation
export const feedbackEnv = cleanEnv(process.env, {
  // SMTP Configuration
  SMTP_HOST: str({ default: "smtp.example.com", desc: "SMTP server hostname" }),
  SMTP_PORT: num({ default: 587, desc: "SMTP server port" }),
  SMTP_SECURE: bool({ default: false, desc: "Use TLS/SSL for SMTP connection" }),
  SMTP_USER: str({ default: "", desc: "SMTP authentication username" }),
  SMTP_PASS: str({ default: "", desc: "SMTP authentication password" }),
  SMTP_FROM_EMAIL: str({ default: "noreply@example.com", desc: "Email address to send from" }),
  SMTP_TO_EMAIL: str({ default: "feedback@example.com", desc: "Email address to receive feedback" }),
});
