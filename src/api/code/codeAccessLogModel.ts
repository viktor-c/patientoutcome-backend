/**
 * @file Code Access Log Model
 * @module api/code/codeAccessLogModel
 * @description Tracks access events and form completion metadata for case access codes
 */

import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

/**
 * Schema for tracking individual form completions within an access session
 */
export const FormCompletionLogSchema = z.object({
  formId: zId("Form"),
  formTemplateName: z.string(),
  startedAt: z.date(),
  completedAt: z.date(),
  durationMs: z.number().int().min(0), // Time taken to fill out the form in milliseconds
});

export type FormCompletionLog = z.infer<typeof FormCompletionLogSchema>;

/**
 * Schema for tracking code access events and associated form completions
 */
export const CodeAccessLogSchema = z.object({
  _id: zId().optional(),
  codeId: zId("Code"), // Reference to the code that was used
  code: z.string(), // The actual code string for quick lookup
  patientCaseId: zId("PatientCase"), // Reference to the patient case
  consultationId: zId("Consultation").optional(), // The consultation that was accessed (if determined)
  accessedAt: z.date(), // When the code was first accessed in this session
  ipAddress: z.string().optional(), // IP address of the accessor (for security/audit)
  userAgent: z.string().optional(), // Browser/device information
  sessionStartedAt: z.date(), // When the form-filling session started
  sessionEndedAt: z.date().optional(), // When the session ended (last form submitted)
  formsCompleted: z.array(FormCompletionLogSchema), // Forms completed in this session
  totalSessionDurationMs: z.number().int().min(0).optional(), // Total time from first access to last form submission
  successful: z.boolean().default(true), // Whether the session was successfully completed
  errorMessage: z.string().optional(), // Error message if session failed
});

export type CodeAccessLog = z.infer<typeof CodeAccessLogSchema>;

/** Create Mongoose Schema and Model */
const MongooseCodeAccessLogSchema = zodSchema(CodeAccessLogSchema.omit({ _id: true }));

// Add index for efficient querying
MongooseCodeAccessLogSchema.index({ codeId: 1, accessedAt: -1 });
MongooseCodeAccessLogSchema.index({ patientCaseId: 1, accessedAt: -1 });
MongooseCodeAccessLogSchema.index({ code: 1, accessedAt: -1 });

export const CodeAccessLogModel = mongoose.model("CodeAccessLog", MongooseCodeAccessLogSchema, "code-access-logs");
