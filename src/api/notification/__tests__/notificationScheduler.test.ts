import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  scheduledCallbacks,
  jobStops,
  mockSchedule,
  mockWarn,
  mockInfo,
  mockError,
  mockNotifyPatient,
  mockSendSchedulerRunSummary,
  mockConsultationLean,
  mockConsultationUpdateOne,
  mockPatientCaseLean,
  mockCodeLean,
} = vi.hoisted(() => ({
  scheduledCallbacks: [] as Array<() => Promise<void> | void>,
  jobStops: [] as ReturnType<typeof vi.fn>[],
  mockSchedule: vi.fn((_: string, callback: () => Promise<void> | void) => {
    const stop = vi.fn();
    scheduledCallbacks.push(callback);
    jobStops.push(stop);
    return { stop };
  }),
  mockWarn: vi.fn(),
  mockInfo: vi.fn(),
  mockError: vi.fn(),
  mockNotifyPatient: vi.fn(async (_event: unknown, _email: string | null, _token: string | null, channels: string[]) => ({
    email: channels.includes("email")
      ? { attempted: 1, succeeded: 1, failed: 0 }
      : { attempted: 0, succeeded: 0, failed: 0 },
    push: channels.includes("push")
      ? { attempted: 1, succeeded: 1, failed: 0 }
      : { attempted: 0, succeeded: 0, failed: 0 },
  })),
  mockSendSchedulerRunSummary: vi.fn().mockResolvedValue(undefined),
  mockConsultationLean: vi.fn(),
  mockConsultationUpdateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
  mockPatientCaseLean: vi.fn(),
  mockCodeLean: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mockSchedule,
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: {
    warn: mockWarn,
    info: mockInfo,
    error: mockError,
  },
}));

vi.mock("@/api/notification/notificationService", () => ({
  notificationService: {
    notifyPatient: mockNotifyPatient,
    sendSchedulerRunSummary: mockSendSchedulerRunSummary,
  },
}));

vi.mock("@/api/consultation/consultationModel.js", () => ({
  consultationModel: {
    find: vi.fn(() => ({ lean: mockConsultationLean })),
    updateOne: mockConsultationUpdateOne,
  },
}));

vi.mock("@/api/case/patientCaseModel.js", () => ({
  PatientCaseModel: {
    findById: vi.fn(() => ({
      select: vi.fn(() => ({ lean: mockPatientCaseLean })),
    })),
  },
}));

vi.mock("@/api/code/codeModel.js", () => ({
  codeModel: {
    find: vi.fn(() => ({
      select: vi.fn(() => ({ lean: mockCodeLean })),
    })),
  },
}));

import {
  initializeNotificationScheduler,
  resolvePatientNotificationTargets,
  shutdownNotificationScheduler,
} from "@/api/notification/notificationScheduler";

describe("notificationScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduledCallbacks.length = 0;
    jobStops.length = 0;
    mockNotifyPatient.mockImplementation(async (_event: unknown, _email: string | null, _token: string | null, channels: string[]) => ({
      email: channels.includes("email")
        ? { attempted: 1, succeeded: 1, failed: 0 }
        : { attempted: 0, succeeded: 0, failed: 0 },
      push: channels.includes("push")
        ? { attempted: 1, succeeded: 1, failed: 0 }
        : { attempted: 0, succeeded: 0, failed: 0 },
    }));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T08:00:00.000Z"));
  });

  afterEach(() => {
    shutdownNotificationScheduler();
    vi.useRealTimers();
  });

  it("resolvePatientNotificationTargets returns only active unique code strings", async () => {
    mockPatientCaseLean.mockResolvedValueOnce({
      notificationContact: {
        email: "patient@example.com",
        futureConsultationReminders: true,
        unsubscribeToken: "unsubscribe-token",
      },
    });
    mockCodeLean.mockResolvedValueOnce([
      { code: "CASE01", activatedOn: "2026-09-25T08:00:00.000Z", expiresOn: "2026-09-27T08:00:00.000Z" },
      { code: "CASE01", activatedOn: "2026-09-25T08:00:00.000Z", expiresOn: "2026-09-27T08:00:00.000Z" },
      { code: "FUT99", activatedOn: "2026-09-27T08:00:00.000Z", expiresOn: "2026-09-28T08:00:00.000Z" },
      { code: "EXP77", activatedOn: "2026-09-20T08:00:00.000Z", expiresOn: "2026-09-25T08:00:00.000Z" },
      { code: "CASE02", activatedOn: "2026-09-24T08:00:00.000Z", validUntil: "2026-09-29T08:00:00.000Z" },
    ]);

    const result = await resolvePatientNotificationTargets("consult-1", "case-1");

    expect(result).toEqual({
      patientEmail: "patient@example.com",
      caseAccessTokens: ["CASE01", "CASE02"],
      unsubscribeToken: "unsubscribe-token",
    });
  });

  it("schedules jobs and sends window-opened reminders via email and push", async () => {
    initializeNotificationScheduler();

    expect(mockSchedule).toHaveBeenCalledTimes(2);

    mockConsultationLean.mockResolvedValueOnce([
      {
        _id: "consult-1",
        patientCaseId: "case-1",
        consultationAccessActiveUntil: "2026-09-29T08:00:00.000Z",
      },
    ]);
    mockPatientCaseLean.mockResolvedValueOnce({
      notificationContact: {
        email: "patient@example.com",
        futureConsultationReminders: true,
        unsubscribeToken: "unsubscribe-token",
      },
    });
    mockCodeLean.mockResolvedValueOnce([
      { code: "CASE01", activatedOn: "2026-09-25T08:00:00.000Z", expiresOn: "2026-09-27T08:00:00.000Z" },
    ]);

    await scheduledCallbacks[0]?.();

    expect(mockNotifyPatient).toHaveBeenNthCalledWith(
      1,
      {
        type: "consultation_window_opened",
        consultationId: "consult-1",
        caseId: "case-1",
        windowClosesAt: new Date("2026-09-29T08:00:00.000Z"),
      },
      "patient@example.com",
      "CASE01",
      ["email"],
      "unsubscribe-token",
    );
    expect(mockNotifyPatient).toHaveBeenNthCalledWith(
      2,
      {
        type: "consultation_window_opened",
        consultationId: "consult-1",
        caseId: "case-1",
        windowClosesAt: new Date("2026-09-29T08:00:00.000Z"),
      },
      null,
      "CASE01",
      ["push"],
    );
    expect(mockConsultationUpdateOne).toHaveBeenCalledWith(
      { _id: "consult-1" },
      { $set: { "notificationTracking.windowOpenNotifiedAt": expect.any(Date) } },
    );
    expect(mockSendSchedulerRunSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "window-open detector",
        consultationsFound: 1,
        consultationsWithTargets: 1,
        consultationsMarkedNotified: 1,
        consultationsSkipped: 0,
        processingFailures: 0,
        emailTargetsRequested: 1,
        pushTargetsRequested: 1,
        email: { attempted: 1, succeeded: 1, failed: 0 },
        push: { attempted: 1, succeeded: 1, failed: 0 },
      }),
    );
  });

  it("sends consultation-day reminders and updates day-tracking state", async () => {
    initializeNotificationScheduler();

    mockConsultationLean.mockResolvedValueOnce([
      {
        _id: "consult-2",
        patientCaseId: "case-2",
        dateAndTime: "2026-09-26T10:00:00.000Z",
      },
    ]);
    mockPatientCaseLean.mockResolvedValueOnce({
      notificationContact: {
        email: "day@example.com",
        futureConsultationReminders: true,
        unsubscribeToken: "day-unsubscribe-token",
      },
    });
    mockCodeLean.mockResolvedValueOnce([
      { code: "DAY01", activatedOn: "2026-09-24T08:00:00.000Z", expiresOn: "2026-09-27T08:00:00.000Z" },
    ]);

    await scheduledCallbacks[1]?.();

    expect(mockNotifyPatient).toHaveBeenNthCalledWith(
      1,
      {
        type: "consultation_day_reminder",
        consultationId: "consult-2",
        caseId: "case-2",
      },
      "day@example.com",
      "DAY01",
      ["email"],
      "day-unsubscribe-token",
    );
    expect(mockNotifyPatient).toHaveBeenNthCalledWith(
      2,
      {
        type: "consultation_day_reminder",
        consultationId: "consult-2",
        caseId: "case-2",
      },
      null,
      "DAY01",
      ["push"],
    );
    expect(mockConsultationUpdateOne).toHaveBeenCalledWith(
      { _id: "consult-2" },
      { $set: { "notificationTracking.consultationDayNotifiedAt": expect.any(Date) } },
    );
    expect(mockSendSchedulerRunSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "consultation-day reminder",
        consultationsFound: 1,
        consultationsWithTargets: 1,
        consultationsMarkedNotified: 1,
        consultationsSkipped: 0,
        processingFailures: 0,
        emailTargetsRequested: 1,
        pushTargetsRequested: 1,
        email: { attempted: 1, succeeded: 1, failed: 0 },
        push: { attempted: 1, succeeded: 1, failed: 0 },
      }),
    );
  });

  it("stops scheduled jobs on shutdown", () => {
    initializeNotificationScheduler();

    shutdownNotificationScheduler();

    expect(jobStops).toHaveLength(2);
    expect(jobStops[0]).toHaveBeenCalledOnce();
    expect(jobStops[1]).toHaveBeenCalledOnce();
  });
});