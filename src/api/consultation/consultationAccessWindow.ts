import { endOfDay, addDays, startOfDay } from "date-fns";

export const DEFAULT_CONSULTATION_ACCESS_DAYS_BEFORE = 3;
export const DEFAULT_CONSULTATION_ACCESS_DAYS_AFTER = 30;

export interface ConsultationAccessWindowSettings {
  consultationAccessDaysBefore: number;
  consultationAccessDaysAfter: number;
}

export interface ConsultationAccessWindowInfo extends ConsultationAccessWindowSettings {
  activeFrom: string;
  activeUntil: string;
  isActive: boolean;
}

export interface StoredConsultationAccessWindowFields extends ConsultationAccessWindowSettings {
  consultationAccessActiveFrom: string;
  consultationAccessActiveUntil: string;
}

function normalizeDays(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function extractId(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record._id === "string") {
      return record._id;
    }
    if (record._id && typeof record._id?.toString === "function") {
      return record._id.toString();
    }
    if (typeof record.id === "string") {
      return record.id;
    }
  }

  return typeof (value as { toString?: () => string }).toString === "function" ? value.toString() : undefined;
}

export function extractConsultationDepartmentId(consultation: unknown): string | undefined {
  if (!consultation || typeof consultation !== "object") {
    return undefined;
  }

  const consultationRecord = consultation as Record<string, unknown>;
  const patientCase = consultationRecord.patientCaseId as Record<string, unknown> | undefined;
  const patient = patientCase?.patient as Record<string, unknown> | undefined;
  const departments = patient?.departments;

  if (!Array.isArray(departments) || departments.length === 0) {
    return undefined;
  }

  return extractId(departments[0]);
}

export async function getDepartmentConsultationAccessSettings(
  departmentId: string | undefined,
): Promise<ConsultationAccessWindowSettings> {
  if (!departmentId) {
    return {
      consultationAccessDaysBefore: DEFAULT_CONSULTATION_ACCESS_DAYS_BEFORE,
      consultationAccessDaysAfter: DEFAULT_CONSULTATION_ACCESS_DAYS_AFTER,
    };
  }

  try {
    const { userDepartmentService } = await import("@/api/userDepartment/userDepartmentService.js");
    const departmentResponse = await userDepartmentService.findById(departmentId);
    const department = departmentResponse.responseObject;

    return {
      consultationAccessDaysBefore: normalizeDays(
        department?.consultationAccessDaysBefore,
        DEFAULT_CONSULTATION_ACCESS_DAYS_BEFORE,
      ),
      consultationAccessDaysAfter: normalizeDays(
        department?.consultationAccessDaysAfter,
        DEFAULT_CONSULTATION_ACCESS_DAYS_AFTER,
      ),
    };
  } catch {
    return {
      consultationAccessDaysBefore: DEFAULT_CONSULTATION_ACCESS_DAYS_BEFORE,
      consultationAccessDaysAfter: DEFAULT_CONSULTATION_ACCESS_DAYS_AFTER,
    };
  }
}

export function buildStoredConsultationAccessWindowFields(
  consultationDate: string | Date,
  settings: ConsultationAccessWindowSettings,
): StoredConsultationAccessWindowFields | null {
  const date = new Date(consultationDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const activeFrom = startOfDay(addDays(date, -settings.consultationAccessDaysBefore));
  const activeUntil = endOfDay(addDays(date, settings.consultationAccessDaysAfter));

  return {
    consultationAccessDaysBefore: settings.consultationAccessDaysBefore,
    consultationAccessDaysAfter: settings.consultationAccessDaysAfter,
    consultationAccessActiveFrom: activeFrom.toISOString(),
    consultationAccessActiveUntil: activeUntil.toISOString(),
  };
}

function buildWindowInfoFromStoredFields(
  consultationRecord: Record<string, unknown>,
): ConsultationAccessWindowInfo | null {
  const activeFromRaw = consultationRecord.consultationAccessActiveFrom;
  const activeUntilRaw = consultationRecord.consultationAccessActiveUntil;
  if (!activeFromRaw || !activeUntilRaw) {
    return null;
  }

  const activeFrom = new Date(activeFromRaw as string | Date);
  const activeUntil = new Date(activeUntilRaw as string | Date);
  if (Number.isNaN(activeFrom.getTime()) || Number.isNaN(activeUntil.getTime())) {
    return null;
  }

  const now = new Date();
  return {
    consultationAccessDaysBefore: normalizeDays(
      consultationRecord.consultationAccessDaysBefore,
      DEFAULT_CONSULTATION_ACCESS_DAYS_BEFORE,
    ),
    consultationAccessDaysAfter: normalizeDays(
      consultationRecord.consultationAccessDaysAfter,
      DEFAULT_CONSULTATION_ACCESS_DAYS_AFTER,
    ),
    activeFrom: activeFrom.toISOString(),
    activeUntil: activeUntil.toISOString(),
    isActive: now >= activeFrom && now <= activeUntil,
  };
}

export async function buildConsultationAccessWindow(consultation: unknown): Promise<ConsultationAccessWindowInfo | null> {
  if (!consultation || typeof consultation !== "object") {
    return null;
  }

  const consultationRecord = consultation as Record<string, unknown>;
  const fromStoredFields = buildWindowInfoFromStoredFields(consultationRecord);
  if (fromStoredFields) {
    return fromStoredFields;
  }

  if (!consultationRecord.dateAndTime) {
    return null;
  }

  const consultationDate = new Date(consultationRecord.dateAndTime as string | Date);
  if (Number.isNaN(consultationDate.getTime())) {
    return null;
  }

  const settings = await getDepartmentConsultationAccessSettings(extractConsultationDepartmentId(consultation));
  const activeFrom = startOfDay(addDays(consultationDate, -settings.consultationAccessDaysBefore));
  const activeUntil = endOfDay(addDays(consultationDate, settings.consultationAccessDaysAfter));
  const now = new Date();

  return {
    ...settings,
    activeFrom: activeFrom.toISOString(),
    activeUntil: activeUntil.toISOString(),
    isActive: now >= activeFrom && now <= activeUntil,
  };
}

export async function attachConsultationAccessWindow<T>(consultation: T): Promise<T> {
  if (!consultation || typeof consultation !== "object") {
    return consultation;
  }

  const accessWindow = await buildConsultationAccessWindow(consultation);
  return {
    ...(consultation as Record<string, unknown>),
    consultationAccessWindow: accessWindow,
  } as T;
}