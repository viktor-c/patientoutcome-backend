import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockConsultationFindLean,
  mockConsultationFindByIdLean,
  mockConsultationUpdateOne,
  mockCaseFindLean,
  mockCaseFindByIdLean,
  mockCaseFindOneLean,
  mockCaseUpdateOne,
  mockCodeFindLean,
  mockCodeFindOneLean,
  mockPushFindLean,
  mockNotifyPatient,
  mockSendPatientEmailConfirmation,
  mockResolveTargets,
} = vi.hoisted(() => ({
  mockConsultationFindLean: vi.fn(),
  mockConsultationFindByIdLean: vi.fn(),
  mockConsultationUpdateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
  mockCaseFindLean: vi.fn(),
  mockCaseFindByIdLean: vi.fn(),
  mockCaseFindOneLean: vi.fn(),
  mockCaseUpdateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
  mockCodeFindLean: vi.fn(),
  mockCodeFindOneLean: vi.fn(),
  mockPushFindLean: vi.fn(),
  mockNotifyPatient: vi.fn(),
  mockSendPatientEmailConfirmation: vi.fn().mockResolvedValue(undefined),
  mockResolveTargets: vi.fn(),
}));

vi.mock("@/api/consultation/consultationModel", () => ({
  consultationModel: {
    find: vi.fn(() => ({ lean: mockConsultationFindLean })),
    findById: vi.fn(() => ({ lean: mockConsultationFindByIdLean })),
    updateOne: mockConsultationUpdateOne,
  },
}));

vi.mock("@/api/case/patientCaseModel", () => ({
  PatientCaseModel: {
    find: vi.fn(() => ({ lean: mockCaseFindLean })),
    findById: vi.fn(() => ({ select: vi.fn(() => ({ lean: mockCaseFindByIdLean })) })),
    findOne: vi.fn(() => ({ select: vi.fn(() => ({ lean: mockCaseFindOneLean })) })),
    updateOne: mockCaseUpdateOne,
  },
}));

vi.mock("@/api/code/codeModel", () => ({
  codeModel: {
    find: vi.fn(() => ({ select: vi.fn(() => ({ lean: mockCodeFindLean })) })),
    findOne: vi.fn(() => ({ select: vi.fn(() => ({ lean: mockCodeFindOneLean })) })),
  },
}));

vi.mock("@/api/notification/pushSubscriptionModel", () => ({
  PushSubscriptionModel: {
    find: vi.fn(() => ({ lean: mockPushFindLean })),
  },
}));

vi.mock("@/api/notification/notificationService", () => ({
  notificationService: {
    notifyPatient: mockNotifyPatient,
    sendPatientEmailConfirmation: mockSendPatientEmailConfirmation,
  },
}));

vi.mock("@/api/notification/notificationScheduler", () => ({
  resolvePatientNotificationTargets: mockResolveTargets,
}));

import {
  clearPatientNotificationContactByCaseId,
  clearPatientNotificationContact,
  confirmPatientNotificationContactByToken,
  getNotificationAdminStatus,
  resendPatientNotificationConfirmationByCaseId,
  renewPatientNotificationConfirmationByToken,
  sendManualNotification,
  unsubscribePatientNotificationEmailByToken,
  upsertPatientNotificationContact,
} from "@/api/notification/notificationAdminService";

describe("notificationAdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregated status with upcoming and recent notifications", async () => {
    mockCaseFindLean.mockResolvedValueOnce([
      {
        _id: "case-1",
        patient: "patient-1",
        notificationContact: {
          email: "patient@example.com",
          futureConsultationReminders: true,
          consentedAt: "2026-09-20T08:00:00.000Z",
        },
      },
    ]);
    mockConsultationFindLean.mockResolvedValueOnce([
      {
        _id: "consult-1",
        patientCaseId: "case-1",
        dateAndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        consultationAccessActiveFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notificationTracking: {
          windowOpenManualSentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ]);
    mockCodeFindLean.mockResolvedValueOnce([{ code: "CASE01", patientCaseId: "case-1", consultationId: "consult-1" }]);
    mockPushFindLean.mockResolvedValueOnce([
      {
        endpoint: "https://push.example/sub-1",
        userAgent: "Chrome",
        createdAt: "2026-09-20T08:00:00.000Z",
        lastDeliveredAt: "2026-09-26T08:00:00.000Z",
        failureCount: 0,
        patientId: "patient-1",
        caseId: "case-1",
        consultationId: "consult-1",
      },
    ]);

    const result = await getNotificationAdminStatus({ caseId: "case-1" });

    expect(result.summary.activePushSubscriptionCount).toBe(1);
    expect(result.summary.activeEmailSubscriptionCount).toBe(1);
    expect(result.upcomingNotifications).toHaveLength(2);
    expect(result.recentNotifications).toEqual([
      expect.objectContaining({
        consultationId: "consult-1",
        type: "consultation_window_opened",
        source: "manual",
      }),
    ]);
  });

  it("supports global admin status queries without scope filters", async () => {
    mockCaseFindLean.mockResolvedValueOnce([
      {
        _id: "case-1",
        patient: "patient-1",
        notificationContact: {
          email: "one@example.com",
          futureConsultationReminders: true,
        },
      },
      {
        _id: "case-2",
        patient: "patient-2",
        notificationContact: {
          email: null,
          futureConsultationReminders: false,
        },
      },
    ]);
    mockConsultationFindLean.mockResolvedValueOnce([
      {
        _id: "consult-1",
        patientCaseId: "case-1",
        dateAndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        consultationAccessActiveFrom: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notificationTracking: {},
      },
      {
        _id: "consult-2",
        patientCaseId: "case-2",
        dateAndTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        consultationAccessActiveFrom: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        notificationTracking: {},
      },
    ]);
    mockCodeFindLean.mockResolvedValueOnce([
      { code: "CASE01", patientCaseId: "case-1", consultationId: "consult-1" },
      { code: "CASE02", patientCaseId: "case-2", consultationId: "consult-2" },
    ]);
    mockPushFindLean.mockResolvedValueOnce([
      {
        endpoint: "https://push.example/sub-1",
        userAgent: "Chrome Desktop",
        createdAt: "2026-09-20T08:00:00.000Z",
        failureCount: 0,
        patientId: "patient-1",
        caseId: "case-1",
        consultationId: "consult-1",
      },
      {
        endpoint: "https://push.example/sub-2",
        userAgent: "Safari iOS",
        createdAt: "2026-09-21T08:00:00.000Z",
        failureCount: 1,
        patientId: "patient-2",
        caseId: "case-2",
        consultationId: "consult-2",
      },
    ]);

    const result = await getNotificationAdminStatus({});

    expect(result.summary.activePushSubscriptionCount).toBe(2);
    expect(result.summary.activeEmailSubscriptionCount).toBe(1);
    expect(result.emailContacts).toHaveLength(2);
    expect(result.pushSubscriptions).toHaveLength(2);
    expect(result.upcomingNotifications).toHaveLength(4);
  });

  it("sends a manual notification and records the manual send timestamp", async () => {
    mockConsultationFindByIdLean.mockResolvedValueOnce({
      _id: "consult-1",
      patientCaseId: "case-1",
      consultationAccessActiveUntil: "2026-09-30T08:00:00.000Z",
    });
    mockResolveTargets.mockResolvedValueOnce({
      patientEmail: "patient@example.com",
      caseAccessTokens: ["CASE01", "CASE02"],
      unsubscribeToken: "unsubscribe-token",
    });
    mockNotifyPatient
      .mockResolvedValueOnce({
        email: { attempted: 1, succeeded: 1, failed: 0 },
        push: { attempted: 0, succeeded: 0, failed: 0 },
      })
      .mockResolvedValueOnce({
        email: { attempted: 0, succeeded: 0, failed: 0 },
        push: { attempted: 1, succeeded: 1, failed: 0 },
      })
      .mockResolvedValueOnce({
        email: { attempted: 0, succeeded: 0, failed: 0 },
        push: { attempted: 1, succeeded: 0, failed: 1 },
      });

    const result = await sendManualNotification("consult-1", "consultation_window_opened");

    expect(result.email.succeeded).toBe(1);
    expect(result.push.attempted).toBe(2);
    expect(mockConsultationUpdateOne).toHaveBeenCalledWith(
      { _id: "consult-1" },
      { $set: { "notificationTracking.windowOpenManualSentAt": expect.any(Date) } },
    );
  });

  it("stores patient email reminder preferences as pending confirmation and sends a confirmation email", async () => {
    mockCodeFindOneLean.mockResolvedValueOnce({ patientCaseId: "case-1" });
    mockCaseFindByIdLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: {},
    });

    const saved = await upsertPatientNotificationContact("CASE01", {
      email: "patient@example.com",
      futureConsultationReminders: true,
      locale: "en-US",
    });

    expect(saved.subscribed).toBe(false);
    expect(saved.confirmationPending).toBe(true);
    expect(saved.email).toBeNull();
    expect(saved.pendingEmail).toBe("patient@example.com");
    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          notificationContact: expect.objectContaining({
            pendingEmail: "patient@example.com",
            pendingFutureConsultationReminders: true,
            confirmationToken: expect.any(String),
            confirmationExpiresAt: expect.any(Date),
            renewalToken: expect.any(String),
          }),
        }),
      }),
    );
    expect(mockSendPatientEmailConfirmation).toHaveBeenCalledOnce();
    expect(mockSendPatientEmailConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      patientEmail: "patient@example.com",
      locale: "en-US",
      confirmToken: expect.any(String),
      renewToken: expect.any(String),
      unsubscribeToken: expect.any(String),
    }));
  });

  it("confirms a pending patient notification contact when the confirmation token is valid", async () => {
    mockCaseFindOneLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: {
        pendingEmail: "patient@example.com",
        pendingFutureConsultationReminders: true,
        confirmationToken: "confirm-token",
        confirmationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        renewalToken: "renew-token",
        unsubscribeToken: "unsubscribe-token",
      },
    });

    const result = await confirmPatientNotificationContactByToken("confirm-token");

    expect(result).toBe("confirmed");
    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "notificationContact.email": "patient@example.com",
          "notificationContact.futureConsultationReminders": true,
          "notificationContact.consentedAt": expect.any(Date),
          "notificationContact.unsubscribedAt": null,
        }),
        $unset: expect.objectContaining({
          "notificationContact.pendingEmail": "",
          "notificationContact.confirmationToken": "",
          "notificationContact.renewalToken": "",
        }),
      }),
    );
  });

  it("renews a pending patient notification confirmation and sends a fresh email", async () => {
    mockCaseFindOneLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: {
        pendingEmail: "patient@example.com",
        pendingFutureConsultationReminders: true,
        renewalToken: "renew-token",
        unsubscribeToken: "unsubscribe-token",
      },
    });

    const result = await renewPatientNotificationConfirmationByToken("renew-token");

    expect(result).toBe("renewed");
    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "notificationContact.confirmationToken": expect.any(String),
          "notificationContact.confirmationExpiresAt": expect.any(Date),
          "notificationContact.renewalToken": expect.any(String),
        }),
      }),
    );
    expect(mockSendPatientEmailConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      patientEmail: "patient@example.com",
      confirmToken: expect.any(String),
      renewToken: expect.any(String),
      unsubscribeToken: "unsubscribe-token",
    }));
  });

  it("clears active or pending notification contact data when unsubscribing by token", async () => {
    mockCaseFindOneLean.mockResolvedValueOnce({
      _id: "case-1",
      notificationContact: {
        unsubscribeToken: "unsubscribe-token",
      },
    });

    const unsubscribed = await unsubscribePatientNotificationEmailByToken("unsubscribe-token");
    expect(unsubscribed).toBe(true);
    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "notificationContact.email": null,
          "notificationContact.futureConsultationReminders": false,
          "notificationContact.pendingEmail": null,
          "notificationContact.pendingFutureConsultationReminders": false,
          "notificationContact.unsubscribedAt": expect.any(Date),
        }),
      }),
    );
  });

  it("clears confirmed patient email reminder preferences by access token", async () => {
    mockCodeFindOneLean.mockResolvedValueOnce({ patientCaseId: "case-1" });
    mockCaseFindByIdLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: { unsubscribeToken: "unsubscribe-token" },
    });

    await clearPatientNotificationContact("CASE01");

    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "notificationContact.email": null,
          "notificationContact.futureConsultationReminders": false,
          "notificationContact.pendingEmail": null,
          "notificationContact.pendingFutureConsultationReminders": false,
        }),
      }),
    );
  });

  it("allows admins to clear a notification subscription directly by case id", async () => {
    mockCaseFindByIdLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: { unsubscribeToken: "unsubscribe-token" },
    });

    await clearPatientNotificationContactByCaseId("case-1");

    expect(mockCaseUpdateOne).toHaveBeenCalledWith(
      { _id: "case-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          "notificationContact.email": null,
          "notificationContact.futureConsultationReminders": false,
          "notificationContact.pendingEmail": null,
          "notificationContact.pendingFutureConsultationReminders": false,
        }),
      }),
    );
  });

  it("allows admins to resend a pending confirmation email by case id", async () => {
    mockCaseFindByIdLean.mockResolvedValueOnce({
      _id: "case-1",
      patient: "patient-1",
      notificationContact: {
        pendingEmail: "patient@example.com",
        pendingFutureConsultationReminders: true,
        renewalToken: "renew-token",
        unsubscribeToken: "unsubscribe-token",
      },
    });

    const result = await resendPatientNotificationConfirmationByCaseId("case-1");

    expect(result).toBe("renewed");
    expect(mockSendPatientEmailConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      patientEmail: "patient@example.com",
      unsubscribeToken: "unsubscribe-token",
    }));
  });
});