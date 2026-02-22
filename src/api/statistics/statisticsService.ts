import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { consultationModel } from "@/api/consultation/consultationModel";
import { FormModel } from "@/api/form/formModel";
import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { surgeryService } from "@/api/surgery/surgeryService";
import type {
  CaseStatistics,
  ConsultationWithScores,
  ScoreDataPoint,
  ScoreDataResponse,
  ScoringData,
} from "./statisticsModel";

export class StatisticsService {
  /**
   * Get statistics for a specific patient case
   * Includes consultation count and PROM scores over time
   */
  async getCaseStatistics(caseId: string): Promise<ServiceResponse<CaseStatistics | null>> {
    try {
      // Get all consultations for the case
      const consultations = await consultationModel
        .find({ patientCaseId: caseId })
        .populate("proms")
        .sort({ dateAndTime: 1 })
        .lean();

      if (!consultations || consultations.length === 0) {
        return ServiceResponse.success(
          "No consultations found for this case",
          {
            totalConsultations: 0,
            caseId,
            consultations: [],
            surgeries: [],
            caseCreatedAt: null,
          },
          StatusCodes.OK,
        );
      }

      // Fetch all surgeries and case creation date for timeline reference
      let caseCreatedAt: Date | null = null;
      const surgeries: { surgeryDate: string; therapy: string | null }[] = [];
      
      try {
        const patientCase = await PatientCaseModel.findById(caseId).lean() as any;
        
        if (patientCase) {
          caseCreatedAt = patientCase.createdAt || null;
        }

        // Use surgery service to fetch all surgeries for this case
        const surgeriesResponse = await surgeryService.getSurgeriesByPatientCaseId(caseId);

        if (surgeriesResponse.success && surgeriesResponse.responseObject) {
          const surgeriesData = surgeriesResponse.responseObject;

          // Sort surgeries by date
          surgeriesData.sort((a, b) => {
            const dateA = new Date(a.surgeryDate).getTime();
            const dateB = new Date(b.surgeryDate).getTime();
            return dateA - dateB;
          });

          // Map surgeries to the statistics format
          for (const surgery of surgeriesData) {
            if (surgery.surgeryDate) {
              surgeries.push({
                surgeryDate: new Date(surgery.surgeryDate).toISOString(),
                therapy: surgery.therapy || null,
              });
            }
          }
        }
      } catch (error) {
        logger.warn({ error }, "Could not fetch surgery/case dates for statistics");
      }

      // Process consultations and extract scores with full scoring data
      const processedConsultations: ConsultationWithScores[] = await Promise.all(
        consultations.map(async (consultation: any) => {
          const scoringEntries: {
            title: string;
            scoring: ScoringData;
            createdAt: Date;
            completedAt: Date | null;
            completionTimeSeconds: number | null;
            formTemplateId?: string | null;
          }[] = [];

          let consultationTitle = "Consultation";
          let createdAt = consultation.dateAndTime;
          let completedAt: Date | null = null;
          let completionTimeSeconds: number | null = null;

          // Get form scores and metadata
          if (consultation.proms && Array.isArray(consultation.proms)) {
            for (const promId of consultation.proms) {
              const form = await FormModel.findById(promId)
                .select("title patientFormData createdAt formTemplateId")
                .lean();

              if (form && form.patientFormData) {
                // Extract scoring data from patientFormData
                const scoringData: ScoringData = {
                  rawFormData: form.patientFormData.rawFormData,
                  subscales: form.patientFormData.subscales,
                  totalScore: form.patientFormData.totalScore,
                };

                // Get completion time from patientFormData
                let promCompletedAt: Date | null = form.patientFormData.completedAt ?? null;
                let promCompletionSeconds: number | null = null;
                if (promCompletedAt && form.patientFormData.beginFill) {
                  promCompletionSeconds = Math.floor(
                    (new Date(promCompletedAt).getTime() - new Date(form.patientFormData.beginFill).getTime()) / 1000,
                  );
                }

                // Push raw scoring data along with the form title, timing and template id
                scoringEntries.push({
                  title: form.title || "",
                  scoring: scoringData,
                  createdAt: form.createdAt || consultation.dateAndTime,
                  completedAt: promCompletedAt,
                  completionTimeSeconds: promCompletionSeconds,
                  formTemplateId: form.formTemplateId ? form.formTemplateId.toString() : null,
                });

                // Use the first prom title as a representative consultation title if not set
                if (consultationTitle === "Consultation" && form.title) {
                  consultationTitle = form.title;
                }

                // Update consultation-level completion metadata from first completed form
                if (form.patientFormData.completedAt && !completedAt) {
                  completedAt = form.patientFormData.completedAt;
                  if (form.patientFormData.beginFill && form.patientFormData.completedAt) {
                    completionTimeSeconds = Math.floor(
                      (new Date(form.patientFormData.completedAt).getTime() - new Date(form.patientFormData.beginFill).getTime()) / 1000,
                    );
                  }
                }

                // Use form creation date if available
                if (form.createdAt) {
                  createdAt = form.createdAt;
                }
              } else {
                // If form missing or has no patientFormData, log and push a placeholder entry
                logger.warn(`Form with ID ${promId} not found or has no patientFormData.`);
                scoringEntries.push({
                  title: form?.title || "Unknown Form",
                  scoring: { rawFormData: {}, subscales: {}, totalScore: null },
                  createdAt: consultation.dateAndTime,
                  completedAt: null,
                  completionTimeSeconds: null,
                  formTemplateId: form?.formTemplateId ? form.formTemplateId.toString() : null,
                });
              }
            }
          }

          // Return a ConsultationWithScores object for this consultation
          return {
            _id: consultation._id,
            caseId: consultation.patientCaseId,
            consultationId: consultation._id,
            title: consultationTitle,
            date: createdAt,
            proms: scoringEntries.length > 0 ? scoringEntries : [],
            completedAt,
            completionTimeSeconds,
          } as ConsultationWithScores;
        }),
      );

      const stats: CaseStatistics = {
        totalConsultations: consultations.length,
        caseId,
        consultations: processedConsultations,
        surgeries,
        caseCreatedAt: caseCreatedAt ? caseCreatedAt.toISOString() : null,
      };
      return ServiceResponse.success("Statistics retrieved successfully", stats, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error retrieving case statistics: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving statistics.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get score data formatted for charting
   * Returns data in both real-time and fixed-interval formats
   */
  async getScoreData(caseId: string): Promise<ServiceResponse<ScoreDataResponse | null>> {
    try {
      const statsResponse = await this.getCaseStatistics(caseId);

      if (!statsResponse.success || !statsResponse.responseObject) {
        return ServiceResponse.failure("Failed to retrieve statistics", null, StatusCodes.NOT_FOUND);
      }

      const { consultations } = statsResponse.responseObject;

      // Create real-time data (based on the first prom date) but do not attempt to map prom titles
      // The frontend will process individual prom scoring and titles.
      const realTimeData: ScoreDataPoint[] = consultations.map((consultation, index) => ({
        date: consultation.proms && consultation.proms.length > 0 ? consultation.proms[0].createdAt : new Date(),
        dateIndex: index,
        // leave prom-specific fields empty; frontend will derive them from consultation.proms
        aofasScore: null,
        efasScore: null,
        moxfqScore: null,
      }));

      // Create fixed-interval data (evenly spaced)
      const fixedIntervalData: ScoreDataPoint[] = consultations.map((consultation, index) => ({
        date: consultation.proms && consultation.proms.length > 0 ? consultation.proms[0].createdAt : new Date(),
        dateIndex: index + 1,
        aofasScore: null,
        efasScore: null,
        moxfqScore: null,
      }));

      return ServiceResponse.success(
        "Score data retrieved successfully",
        {
          realTime: realTimeData,
          fixedInterval: fixedIntervalData,
        },
        StatusCodes.OK,
      );
    } catch (ex) {
      const errorMessage = `Error retrieving score data: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving score data.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const statisticsService = new StatisticsService();
