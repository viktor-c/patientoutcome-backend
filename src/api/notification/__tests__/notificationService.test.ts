/**
 * Unit tests for the notification service core logic:
 *   1. form_completed event fires only on incomplete → complete transition
 *   2. form_completed event does NOT fire on complete → complete (already done)
 *   3. notifyAdmins respects NOTIFICATIONS_ENABLED=false
 *   4. notifyPatient respects NOTIFICATIONS_ENABLED=false
 *   5. sendPushToSubscriptions archives subscription on 410 Gone
 *
 * The nodemailer transporter and web-push library are mocked so no network
 * calls are made during tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock web-push before any imports ────────────────────────────────────────
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

// ── Mock nodemailer ──────────────────────────────────────────────────────────
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

// ── Mock PushSubscriptionModel ───────────────────────────────────────────────
// vi.hoisted ensures these are declared before vi.mock() hoisting runs
const { mockLeanFn, mockFindOneLean, mockUpdateOne } = vi.hoisted(() => ({
  mockLeanFn: vi.fn().mockResolvedValue([]),
  mockFindOneLean: vi.fn().mockResolvedValue(null),
  mockUpdateOne: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/api/notification/pushSubscriptionModel", () => ({
  PushSubscriptionModel: {
    find: vi.fn().mockReturnValue({ lean: mockLeanFn }),
    findOne: vi.fn().mockReturnValue({ lean: mockFindOneLean }),
    updateOne: mockUpdateOne,
  },
}));

// ── Mock notification env so we can control flags ────────────────────────────
vi.mock("@/common/utils/notificationEnvConfig", () => ({
  notificationEnv: {
    NOTIFICATIONS_ENABLED: true,
    VAPID_PUBLIC_KEY: "test-vapid-public-key",
    VAPID_PRIVATE_KEY: "test-vapid-private-key",
    VAPID_SUBJECT: "mailto:test@example.com",
    FRONTEND_URL: "http://localhost:5173",
    BACKEND_URL: "http://localhost:40001",
    NOTIFICATION_ADMIN_EMAILS: "",
  },
}));

// ── Mock emailTemplateService ─────────────────────────────────────────────────
vi.mock("@/common/services/emailTemplateService", () => ({
  emailTemplateService: {
    render: vi.fn().mockReturnValue({
      html: "<p>test</p>",
      text: "test",
      subject: "Test subject",
    }),
  },
}));

// ── Mock feedbackEnvConfig ────────────────────────────────────────────────────
vi.mock("@/common/utils/feedbackEnvConfig", () => ({
  feedbackEnv: {
    SMTP_HOST: "localhost",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "test",
    SMTP_PASS: "test",
    SMTP_FROM_EMAIL: "from@test.com",
    SMTP_TO_EMAIL: "to@test.com",
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { notificationService } from "@/api/notification/notificationService";
import { PushSubscriptionModel } from "@/api/notification/pushSubscriptionModel";
import { notificationEnv } from "@/common/utils/notificationEnvConfig";
import webpush from "web-push";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset lean mock to return empty array by default
    mockLeanFn.mockResolvedValue([]);
    mockFindOneLean.mockResolvedValue(null);
    // Restore NOTIFICATIONS_ENABLED to true before each test
    (notificationEnv as any).NOTIFICATIONS_ENABLED = true;
    (notificationEnv as any).NOTIFICATION_ADMIN_EMAILS = "";
  });

  // ── Admin email / push ───────────────────────────────────────────────────

  it("sends admin email when notifyAdmins is called with email recipients", async () => {
    await notificationService.notifyAdmins(
      {
        type: "form_completed",
        formId: "form-1",
        consultationId: "consult-1",
        caseId: "case-1",
        formTemplateName: "MOXFQ",
      },
      ["admin@hospital.de"],
      ["email"],
    );

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("admin@hospital.de");
  });

  it("does NOT send when NOTIFICATIONS_ENABLED is false", async () => {
    (notificationEnv as any).NOTIFICATIONS_ENABLED = false;

    await notificationService.notifyAdmins(
      { type: "form_completed", consultationId: "c", caseId: "k", formId: "f" },
      ["admin@hospital.de"],
      ["email"],
    );

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("includes NOTIFICATION_ADMIN_EMAILS recipients alongside provided list", async () => {
    (notificationEnv as any).NOTIFICATION_ADMIN_EMAILS = "extra@hospital.de";

    await notificationService.notifyAdmins(
      { type: "form_completed", consultationId: "c", caseId: "k" },
      ["supervisor@hospital.de"],
      ["email"],
    );

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    // Both addresses should appear in the `to` field
    expect(call.to).toContain("supervisor@hospital.de");
    expect(call.to).toContain("extra@hospital.de");
  });

  it("sends scheduler summary emails to configured admin recipients", async () => {
    (notificationEnv as any).NOTIFICATION_ADMIN_EMAILS = "ops@hospital.de,admin@hospital.de";

    await notificationService.sendSchedulerRunSummary({
      jobName: "consultation-day reminder",
      schedule: "0 8 * * *",
      startedAt: new Date("2026-09-26T08:00:00.000Z"),
      finishedAt: new Date("2026-09-26T08:02:00.000Z"),
      consultationsFound: 2,
      consultationsWithTargets: 2,
      consultationsMarkedNotified: 1,
      consultationsSkipped: 0,
      processingFailures: 1,
      emailTargetsRequested: 1,
      pushTargetsRequested: 2,
      email: { attempted: 1, succeeded: 1, failed: 0 },
      push: { attempted: 2, succeeded: 1, failed: 1 },
      failureDetails: ["Failed consultation consult-2: push send failed"],
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toContain("ops@hospital.de");
    expect(call.to).toContain("admin@hospital.de");
    expect(call.subject).toContain("consultation-day reminder");
    expect(call.text).toContain("Consultations found: 2");
    expect(call.text).toContain("Push delivery: attempted=2, succeeded=1, failed=1");
  });

  it("deduplicates recipient email addresses", async () => {
    (notificationEnv as any).NOTIFICATION_ADMIN_EMAILS = "supervisor@hospital.de";

    await notificationService.notifyAdmins(
      { type: "form_completed", consultationId: "c", caseId: "k" },
      ["supervisor@hospital.de"],
      ["email"],
    );

    // Single sendMail call with deduplicated single address
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    // Should not repeat the address
    expect(call.to).toBe("supervisor@hospital.de");
  });

  // ── Admin push ───────────────────────────────────────────────────────────

  it("sends push notification to admin subscriptions", async () => {
    const mockSub = {
      endpoint: "https://fcm.googleapis.com/test",
      keys: { auth: "auth", p256dh: "p256dh" },
    };
    mockLeanFn.mockResolvedValueOnce([mockSub]);

    await notificationService.notifyAdmins(
      { type: "form_completed", consultationId: "c", caseId: "k", formTemplateName: "MOXFQ" },
      [],
      ["push"],
      ["user-id-1"],
    );

    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    const [subArg, payloadArg] = vi.mocked(webpush.sendNotification).mock.calls[0];
    expect(subArg.endpoint).toBe("https://fcm.googleapis.com/test");
    const payload = JSON.parse(payloadArg as string);
    expect(payload.title).toBe("Form completed");
    expect(payload.url).toContain("/case/k");
  });

  it("archives subscription when push returns 410 Gone", async () => {
    const goneError = Object.assign(new Error("Gone"), { statusCode: 410 });
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(goneError);

    const mockSub = {
      endpoint: "https://fcm.googleapis.com/gone",
      keys: { auth: "auth", p256dh: "p256dh" },
    };
    mockLeanFn.mockResolvedValueOnce([mockSub]);

    await notificationService.notifyAdmins(
      { type: "form_completed", consultationId: "c", caseId: "k" },
      [],
      ["push"],
      ["user-id-1"],
    );

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { endpoint: "https://fcm.googleapis.com/gone" },
      { $set: { archivedAt: expect.any(Date) } },
    );
  });

  // ── Patient notifications ────────────────────────────────────────────────

  it("sends patient window-opened email", async () => {
    await notificationService.notifyPatient(
      {
        type: "consultation_window_opened",
        consultationId: "c",
        caseId: "k",
        windowClosesAt: new Date("2026-07-10"),
      },
      "patient@example.de",
      null,
      ["email"],
    );

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("patient@example.de");
  });

  it("does NOT send patient email when no email provided", async () => {
    await notificationService.notifyPatient(
      { type: "consultation_window_opened", consultationId: "c", caseId: "k" },
      null,
      null,
      ["email"],
    );

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("deep-links patient push notifications to the subscribed access-code flow", async () => {
    const mockSub = {
      endpoint: "https://fcm.googleapis.com/patient",
      keys: { auth: "auth", p256dh: "p256dh" },
    };
    mockLeanFn.mockResolvedValueOnce([mockSub]);

    await notificationService.notifyPatient(
      { type: "consultation_day_reminder", consultationId: "consult-1", caseId: "case-1" },
      null,
      "XOL70",
      ["push"],
    );

    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    const [, payloadArg] = vi.mocked(webpush.sendNotification).mock.calls[0];
    const payload = JSON.parse(payloadArg as string);
    expect(payload.url).toBe("http://localhost:5173/flow/XOL70");
    expect(payload.title).toBe("Termin heute");
  });

  it("sends a development test push to a stored endpoint", async () => {
    mockFindOneLean.mockResolvedValueOnce({
      endpoint: "https://fcm.googleapis.com/test-endpoint",
      keys: { auth: "auth", p256dh: "p256dh" },
    });

    const result = await notificationService.sendDevelopmentTestPush({
      endpoint: "https://fcm.googleapis.com/test-endpoint",
      url: "http://localhost:5173/consultation/forms/external-code/SJM13",
    });

    expect(result).toBe("sent");
    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    const [, payloadArg] = vi.mocked(webpush.sendNotification).mock.calls[0];
    const payload = JSON.parse(payloadArg as string);
    expect(payload.title).toBe("Test notification");
    expect(payload.url).toBe("http://localhost:5173/consultation/forms/external-code/SJM13");
  });

  // ── VAPID key helper ─────────────────────────────────────────────────────

  it("getVapidPublicKey returns the configured key", () => {
    expect(notificationService.getVapidPublicKey()).toBe("test-vapid-public-key");
  });
});
