/**
 * Frontend-safe type exports derived from backend Zod schemas
 * This is the single source of truth for type definitions across the application
 */

// Re-export Zod-inferred types from backend models
export type { Patient } from "../api/patient/patientModel";
export type { PatientCase, CreatePatientCase } from "../api/case/patientCaseModel";
export type { Form } from "../api/form/formModel";
export type { Surgery, CreateSurgery } from "../api/surgery/surgeryModel";
export type { User, UserNoPassword } from "../api/user/userModel";

// Re-export Zod schemas for runtime validation when needed
export { PatientSchema } from "../api/patient/patientModel";
export { PatientCaseSchema, CreatePatientCaseSchema } from "../api/case/patientCaseModel";
export { Form as FormSchema } from "../api/form/formModel";
export { SurgerySchema, CreateSurgerySchema } from "../api/surgery/surgeryModel";
export { UserSchema, UserNoPasswordSchema } from "../api/user/userModel";

// Shared scoring types
export * from "./scoring";

// Frontend-safe versions of backend types
/**
 * These convert Mongoose ObjectId references to strings for frontend consumption
 */

export interface FrontendForm {
  _id?: string;
  id?: string; // For OpenAPI compatibility
  title?: string;
  description?: string;
  caseId?: string | null;
  consultationId?: string | null;
  formTemplateId?: string | null;
  patientFormData?: import("./scoring").PatientFormData | null;
  createdAt?: string;
  updatedAt?: string;
  formStartTime?: string;
  formEndTime?: string;
  completionTimeSeconds?: number;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
}

export interface FrontendPatient {
  _id?: string;
  id?: string; // For OpenAPI compatibility
  externalPatientId: string[];
  sex?: string;
  cases?: string[]; // ObjectId references converted to strings
  createdAt?: string;
  updatedAt?: string;
}

export interface FrontendPatientCase {
  _id?: string;
  id?: string; // For OpenAPI compatibility
  externalId?: string;
  createdAt?: string;
  updatedAt?: string;
  patient: string | null; // ObjectId reference as string
  mainDiagnosis?: string[];
  mainDiagnosisICD10?: string[];
  otherDiagnosis?: string[];
  otherDiagnosisICD10?: string[];
  surgeries: string[]; // ObjectId references as strings
  supervisors: string[]; // ObjectId references as strings
  medicalHistory?: string;
  consultations?: string[]; // ObjectId references as strings
}

export interface FrontendSurgery {
  _id?: string;
  id?: string; // For OpenAPI compatibility
  externalId?: string;
  diagnosis?: string[];
  diagnosisICD10?: string[];
  therapy?: string;
  OPSCodes?: string[];
  side: "left" | "right" | "none";
  surgeryDate: string | null;
  surgeryTime?: number;
  tourniquet?: number;
  anaesthesiaType?: {
    general?: boolean;
    regional?: boolean;
    local?: boolean;
    sedation?: boolean;
    other?: string;
  };
  roentgenDosis?: number;
  roentgenTime?: string;
  additionalData?: Array<{
    content: string;
    createdAt?: string;
    createdBy?: string;
  }>;
  surgeons: string[]; // ObjectId references as strings
  patientCase: string | null; // ObjectId reference as string
  createdAt?: string;
  updatedAt?: string;
}

export interface FrontendUser {
  _id?: string;
  id?: string; // For OpenAPI compatibility
  username: string;
  name: string;
  email: string;
  department?: string;
  belongsToCenter?: string[];
  roles: string[];
  daysBeforeConsultations?: number;
  createdAt?: string;
  updatedAt?: string;
}

// API Response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  responseObject?: T;
  statusCode: number;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
