import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import type { Server } from "node:http";
import mongoose from "mongoose";
import type request from "supertest";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RUN_REAL_SMTP_BACKEND_TEST = process.env.RUN_REAL_SMTP_NOTIFICATION_BACKEND_TEST === "true";
const maybeDescribe = RUN_REAL_SMTP_BACKEND_TEST ? describe : describe.skip;

const TEST_CASE_ACCESS_TOKEN = "SJM13";
const TEST_CASE_ID = "677da5efcb4569ad1c655160";
const TEST_CONSULTATION_ID = "60d5ec49f1b2c12d88f1e8a3";
const TEST_PORT = 40123;
const TEST_BACKEND_URL = `http://127.0.0.1:${TEST_PORT}`;

interface MailboxConfig {
  recipientEmail: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
}

interface ConfirmationMessage {
  subject: string;
  text: string;
  html: string;
}

class NotificationMailbox {
  private client: ImapFlow;

  constructor(private readonly config: MailboxConfig) {
    this.client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapSecure,
      auth: {
        user: config.imapUser,
        pass: config.imapPassword,
      },
      tls: { rejectUnauthorized: false },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.mailboxOpen("INBOX");
  }

  getMessageCount(): number {
    return this.client.mailbox.exists ?? 0;
  }

  async waitForMessageContaining(fragment: string, afterCount: number, timeoutMs = 90_000): Promise<ConfirmationMessage> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.client.noop();
      const currentCount = this.client.mailbox.exists ?? 0;

      if (currentCount > afterCount) {
        for await (const message of this.client.fetch(`${afterCount + 1}:*`, { source: true })) {
          const parsed = await simpleParser(message.source);
          const subject = parsed.subject ?? "";
          const text = parsed.text ?? "";
          const html = typeof parsed.html === "string" ? parsed.html : "";
          const combined = `${subject}\n${text}\n${html}`;

          if (combined.includes(fragment)) {
            return { subject, text, html };
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }

    throw new Error(`Timed out waiting for mailbox message containing ${fragment}.`);
  }

  async waitForConfirmationMessage(afterCount: number, timeoutMs = 90_000): Promise<ConfirmationMessage> {
    return this.waitForMessageContaining("/notifications/email/confirm/", afterCount, timeoutMs);
  }

  async close(): Promise<void> {
    await this.client.logout().catch(() => undefined);
  }
}

function loadMailboxConfig(): MailboxConfig {
  const envPath = path.resolve(__dirname, "../../../../.env");
  const parsed = dotenv.parse(readFileSync(envPath, "utf-8"));

  const recipientEmail = process.env.NOTIFICATION_TEST_EMAIL || parsed.SMTP_FROM_EMAIL || parsed.SMTP_USER;
  const imapHost = process.env.NOTIFICATION_TEST_IMAP_HOST || parsed.SMTP_HOST;
  const imapPort = Number(process.env.NOTIFICATION_TEST_IMAP_PORT || "993");
  const imapSecure = (process.env.NOTIFICATION_TEST_IMAP_SECURE || "true") !== "false";
  const imapUser = process.env.NOTIFICATION_TEST_IMAP_USER || parsed.SMTP_USER;
  const imapPassword = process.env.NOTIFICATION_TEST_IMAP_PASSWORD || parsed.SMTP_PASS;

  if (!recipientEmail || !imapHost || !imapUser || !imapPassword) {
    throw new Error(
      "Real SMTP backend test requires SMTP/IMAP credentials. Set NOTIFICATION_TEST_* env vars or configure patientoutcome-backend/.env.",
    );
  }

  return {
    recipientEmail,
    imapHost,
    imapPort,
    imapSecure,
    imapUser,
    imapPassword,
  };
}

function extractConfirmationUrl(message: ConfirmationMessage): string {
  return extractActionUrl(message, "confirm");
}

function extractActionUrl(message: ConfirmationMessage, action: "confirm" | "renew" | "unsubscribe"): string {
  const combined = `${message.text}\n${message.html}`;
  const match = combined.match(new RegExp(`https?:\\/\\/[^\\s\"'<>]+\\/notifications\\/email\\/${action}\\/[A-Za-z0-9-]+`));
  if (!match?.[0]) {
    throw new Error(`Could not find ${action} URL in notification email.`);
  }
  return match[0];
}

async function curlGet(url: string): Promise<string> {
  const result = await execFileAsync("curl", ["-fsSL", url], {
    env: {
      ...process.env,
      BACKEND_URL: TEST_BACKEND_URL,
    },
  });

  return result.stdout;
}

async function loginAdminAgent(app: Express): Promise<request.SuperAgentTest> {
  const supertest = await import("supertest");
  const agent = supertest.default.agent(app);
  await agent
    .post("/user/login")
    .send({ username: "ewilson", password: "password123#124" })
    .expect(200);
  return agent;
}

async function waitForMongooseConnection(timeoutMs = 30_000): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for mongoose to connect."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      mongoose.connection.off("connected", onConnected);
      mongoose.connection.off("error", onError);
    };

    const onConnected = () => {
      cleanup();
      resolve();
    };

    const onError = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    mongoose.connection.on("connected", onConnected);
    mongoose.connection.on("error", onError);
  });
}

maybeDescribe("Notification real email integration", () => {
  let app: Express;
  let server: Server;
  let mailbox: NotificationMailbox;
  let mailboxConfig: MailboxConfig;
  let patientCaseModel: typeof import("@/api/case/patientCaseModel").PatientCaseModel;
  let runConsultationDayReminderJob: typeof import("@/api/notification/notificationScheduler").runConsultationDayReminderJob;

  beforeAll(async () => {
    process.env.BACKEND_URL = TEST_BACKEND_URL;
    vi.resetModules();

    mailboxConfig = loadMailboxConfig();
    mailbox = new NotificationMailbox(mailboxConfig);
    await mailbox.connect();

    const serverModule = await import("@/server");
    app = serverModule.app;
    patientCaseModel = (await import("@/api/case/patientCaseModel")).PatientCaseModel;
    runConsultationDayReminderJob = (await import("@/api/notification/notificationScheduler")).runConsultationDayReminderJob;

    await waitForMongooseConnection();

    await new Promise<void>((resolve, reject) => {
      server = app.listen(TEST_PORT, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });

    const seedResponse = await request(app).get("/seed/reset-all");
    expect(seedResponse.status).toBe(200);
  }, 120_000);

  afterAll(async () => {
    await mailbox?.close();
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("sends a confirmation email, confirms it via curl, and persists the subscribed reminder state", async () => {
    const inboxCheckpoint = mailbox.getMessageCount();

    const clearResponse = await request(app).delete(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect([204, 404]).toContain(clearResponse.status);

    const saveResponse = await request(app)
      .post("/notifications/patient-contact")
      .send({
        caseAccessToken: TEST_CASE_ACCESS_TOKEN,
        email: mailboxConfig.recipientEmail,
        futureConsultationReminders: true,
        locale: "en",
      });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.pendingEmail).toBe(mailboxConfig.recipientEmail);
    expect(saveResponse.body.confirmationPending).toBe(true);
    expect(saveResponse.body.subscribed).toBe(false);

    const confirmationMessage = await mailbox.waitForConfirmationMessage(inboxCheckpoint);
    const renewalUrl = extractActionUrl(confirmationMessage, "renew");
    const unsubscribeUrl = extractActionUrl(confirmationMessage, "unsubscribe");

    const renewalCheckpoint = mailbox.getMessageCount();
    const renewalHtml = await curlGet(renewalUrl);
    expect(renewalHtml).toContain("New confirmation email sent");

    const renewedConfirmationMessage = await mailbox.waitForConfirmationMessage(renewalCheckpoint);
    const confirmationUrl = extractConfirmationUrl(renewedConfirmationMessage);
    const confirmationHtml = await curlGet(confirmationUrl);
    expect(confirmationHtml).toContain("Email reminders enabled");

    const confirmedResponse = await request(app).get(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect(confirmedResponse.status).toBe(200);
    expect(confirmedResponse.body.email).toBe(mailboxConfig.recipientEmail);
    expect(confirmedResponse.body.pendingEmail).toBeNull();
    expect(confirmedResponse.body.confirmationPending).toBe(false);
    expect(confirmedResponse.body.subscribed).toBe(true);

    const unsubscribeHtml = await curlGet(unsubscribeUrl);
    expect(unsubscribeHtml).toContain("Notifications disabled");

    const unsubscribedResponse = await request(app).get(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect(unsubscribedResponse.status).toBe(200);
    expect(unsubscribedResponse.body.email).toBeNull();
    expect(unsubscribedResponse.body.pendingEmail).toBeNull();
    expect(unsubscribedResponse.body.confirmationPending).toBe(false);
    expect(unsubscribedResponse.body.subscribed).toBe(false);
  }, 180_000);

  it("lets admins view pending status, resend confirmation, and delete the subscription", async () => {
    const adminAgent = await loginAdminAgent(app);

    const clearResponse = await request(app).delete(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect([204, 404]).toContain(clearResponse.status);

    const initialCheckpoint = mailbox.getMessageCount();
    const saveResponse = await request(app)
      .post("/notifications/patient-contact")
      .send({
        caseAccessToken: TEST_CASE_ACCESS_TOKEN,
        email: mailboxConfig.recipientEmail,
        futureConsultationReminders: true,
        locale: "en",
      });

    expect(saveResponse.status).toBe(200);
    await mailbox.waitForConfirmationMessage(initialCheckpoint);

    const statusResponse = await adminAgent.get("/notifications/admin/status").query({ caseId: TEST_CASE_ID });
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.emailContacts).toEqual([
      expect.objectContaining({
        caseId: TEST_CASE_ID,
        pendingEmail: mailboxConfig.recipientEmail,
        confirmationPending: true,
      }),
    ]);

    const resendCheckpoint = mailbox.getMessageCount();
    const resendResponse = await adminAgent.post(`/notifications/admin/patient-contact/${TEST_CASE_ID}/resend-confirmation`);
    expect(resendResponse.status).toBe(200);
    expect(resendResponse.body.message).toBe("Confirmation email resent.");

    const resentMessage = await mailbox.waitForConfirmationMessage(resendCheckpoint);
    expect(extractConfirmationUrl(resentMessage)).toContain("/notifications/email/confirm/");

    const deleteResponse = await adminAgent.delete(`/notifications/admin/patient-contact/${TEST_CASE_ID}`);
    expect(deleteResponse.status).toBe(204);

    const clearedResponse = await request(app).get(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect(clearedResponse.status).toBe(200);
    expect(clearedResponse.body.email).toBeNull();
    expect(clearedResponse.body.pendingEmail).toBeNull();
    expect(clearedResponse.body.confirmationPending).toBe(false);
    expect(clearedResponse.body.subscribed).toBe(false);
  }, 180_000);

  it("returns the expired-link response and keeps the subscription pending when the confirmation token has expired", async () => {
    const inboxCheckpoint = mailbox.getMessageCount();

    const clearResponse = await request(app).delete(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect([204, 404]).toContain(clearResponse.status);

    const saveResponse = await request(app)
      .post("/notifications/patient-contact")
      .send({
        caseAccessToken: TEST_CASE_ACCESS_TOKEN,
        email: mailboxConfig.recipientEmail,
        futureConsultationReminders: true,
        locale: "en",
      });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.confirmationPending).toBe(true);

    const confirmationMessage = await mailbox.waitForConfirmationMessage(inboxCheckpoint);
    const confirmationUrl = extractConfirmationUrl(confirmationMessage);

    await patientCaseModel.updateOne(
      { _id: TEST_CASE_ID },
      {
        $set: {
          "notificationContact.confirmationExpiresAt": new Date(Date.now() - 60_000),
        },
      },
    );

    const expiredResponse = await execFileAsync("curl", ["-sS", "-o", "-", "-w", "\n%{http_code}", confirmationUrl], {
      env: {
        ...process.env,
        BACKEND_URL: TEST_BACKEND_URL,
      },
    });

    const trimmedOutput = expiredResponse.stdout.trimEnd();
    const lastLineBreak = trimmedOutput.lastIndexOf("\n");
    const html = lastLineBreak >= 0 ? trimmedOutput.slice(0, lastLineBreak) : trimmedOutput;
    const statusCode = lastLineBreak >= 0 ? trimmedOutput.slice(lastLineBreak + 1) : "";

    expect(statusCode).toBe("410");
    expect(html).toContain("Link expired");

    const pendingResponse = await request(app).get(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.email).toBeNull();
    expect(pendingResponse.body.pendingEmail).toBe(mailboxConfig.recipientEmail);
    expect(pendingResponse.body.confirmationPending).toBe(true);
    expect(pendingResponse.body.confirmationExpired).toBe(true);
    expect(pendingResponse.body.subscribed).toBe(false);
  }, 180_000);

  it("uses the seeded patient case with tomorrow's consultation when the scheduler sends the day reminder email", async () => {
    const reseedResponse = await request(app).get("/seed/reset-all");
    expect(reseedResponse.status).toBe(200);

    const seededContactResponse = await request(app).get(`/notifications/patient-contact/${TEST_CASE_ACCESS_TOKEN}`);
    expect(seededContactResponse.status).toBe(200);
    expect(seededContactResponse.body.email).toBe(mailboxConfig.recipientEmail);
    expect(seededContactResponse.body.subscribed).toBe(true);

    const inboxCheckpoint = mailbox.getMessageCount();
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(8, 0, 0, 0);

    await runConsultationDayReminderJob(tomorrowMorning);

    const reminderMessage = await mailbox.waitForMessageContaining(`/flow/${TEST_CASE_ACCESS_TOKEN}`, inboxCheckpoint);
    expect(reminderMessage.text + reminderMessage.html).toContain(`/flow/${TEST_CASE_ACCESS_TOKEN}`);

    const consultationByCodeResponse = await request(app).get(`/consultation/code/${TEST_CASE_ACCESS_TOKEN}`);
    expect(consultationByCodeResponse.status).toBe(200);
    expect(consultationByCodeResponse.body.responseObject._id).toBe(TEST_CONSULTATION_ID);
  }, 180_000);
});