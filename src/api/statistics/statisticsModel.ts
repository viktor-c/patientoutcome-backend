import { dateSchema } from "@/api/generalSchemas";
import { zId } from "@zodyac/zod-mongoose";
import { z } from "@/common/utils/zodInit";

/**
 * Schema for the scoring object that matches the ScoringData interface
 * This ensures proper typing for the scoring field
 */
export const SubscaleScoreSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  rawScore: z.number(),
  normalizedScore: z.number(),
  maxPossibleScore: z.number(),
  answeredQuestions: z.number(),
  totalQuestions: z.number(),
  completionPercentage: z.number(),
  isComplete: z.boolean(),
});

export const ScoringDataSchema = z.object({
  rawData: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).nullable(),
  subscales: z.record(z.string(), SubscaleScoreSchema.nullable()).optional(),
  total: SubscaleScoreSchema.nullable(),
});

/**
 * Schema for a consultation with statistics-relevant fields
 * Includes consultation metadata and scoring information
 */
export const ConsultationWithScoresSchema = z.object({
  _id: zId("Consultation"),
  caseId: zId("PatientCase"),
  consultationId: zId("Consultation"), // Same as _id, kept for clarity
  proms: z.array(
    z.object({
      scoring: ScoringDataSchema,
      formTemplateId: zId("FormTemplate").nullable().optional(),
      title: z.string(),
      createdAt: dateSchema,
      completedAt: dateSchema.nullable().optional(),
      completionTimeSeconds: z.number().nullable().optional(),
    })
  )
});

/**
 * Schema for surgery data in statistics
 * Contains essential surgery information for plotting
 */
export const SurgeryStatisticsSchema = z.object({
  surgeryDate: z.string(),
  therapy: z.string().nullable().optional(),
});

/**
 * Schema for case statistics response
 * Contains array of consultations with their scores and surgeries
 */
export const CaseStatisticsSchema = z.object({
  totalConsultations: z.number(),
  caseId: zId("PatientCase"),
  consultations: z.array(ConsultationWithScoresSchema),
  surgeries: z.array(SurgeryStatisticsSchema),
  caseCreatedAt: z.string().nullable().optional(),
});

/**
 * Schema for score data points used in charts
 */
export const ScoreDataPointSchema = z.object({
  date: dateSchema,
  dateIndex: z.number(),
  aofasScore: z.number().nullable(),
  efasScore: z.number().nullable(),
  moxfqScore: z.number().nullable(),
});

/**
 * Schema for score data response with both real-time and fixed-interval data
 */
export const ScoreDataResponseSchema = z.object({
  realTime: z.array(ScoreDataPointSchema),
  fixedInterval: z.array(ScoreDataPointSchema),
});

// Export types
export type SubscaleScore = z.infer<typeof SubscaleScoreSchema>;
export type ScoringData = z.infer<typeof ScoringDataSchema>;
export type ConsultationWithScores = z.infer<typeof ConsultationWithScoresSchema>;
export type SurgeryStatistics = z.infer<typeof SurgeryStatisticsSchema>;
export type CaseStatistics = z.infer<typeof CaseStatisticsSchema>;
export type ScoreDataPoint = z.infer<typeof ScoreDataPointSchema>;
export type ScoreDataResponse = z.infer<typeof ScoreDataResponseSchema>;
