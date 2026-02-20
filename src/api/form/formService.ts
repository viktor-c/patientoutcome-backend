import { ServiceResponse } from "@/common/models/serviceResponse";
import { activityLogService } from "@/common/services/activityLogService";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { CustomFormDataSchema } from "../formtemplate/formTemplateModel";
import type { Form } from "./formModel";
import { formRepository } from "./formRepository";
import { formVersionService } from "./formVersionService";

export interface UserContext {
  username?: string;
  userId?: string;
  roles?: string[];
}

/**
 * Helper function to calculate the relative creation date for a form based on postopWeek.
 * For kiosk users, the form's createdAt should reflect the consultation date (which is based on postopWeek),
 * not the actual submission time.
 *
 * @param consultationId - The ID of the consultation this form belongs to
 * @param postopWeek - The postoperative week number for kiosk users
 * @returns The calculated relative date, or null if it cannot be determined
 */
async function calculateRelativeCreatedAtDate(
  consultationId: string | undefined,
  postopWeek: number | undefined,
): Promise<Date | null> {
  try {
    if (!consultationId || !postopWeek) {
      return null;
    }

    // Import dynamically to avoid circular dependencies
    const consultationModule = await import("@/api/consultation/consultationModel.js");
    const surgeryModule = await import("@/api/surgery/surgeryModel.js");
    const caseModule = await import("@/api/case/patientCaseModel.js");

    const consultationModel = consultationModule.consultationModel;
    const SurgeryModel = surgeryModule.SurgeryModel;
    const PatientCaseModel = caseModule.PatientCaseModel;

    // Get consultation to find the patient case
    const consultation = await consultationModel.findById(consultationId).lean();
    if (!consultation) {
      logger.debug({ consultationId }, "Consultation not found for relative date calculation");
      return null;
    }

    // Get the patient case
    const patientCase = await PatientCaseModel.findById(consultation.patientCaseId).lean() as any;
    if (!patientCase || !patientCase.surgeries || patientCase.surgeries.length === 0) {
      logger.debug({ patientCaseId: consultation.patientCaseId }, "No surgeries found for relative date calculation");
      return null;
    }

    // Get the first surgery date
    const surgery = await SurgeryModel.findById(patientCase.surgeries[0]).lean() as any;
    if (!surgery || !surgery.surgeryDate) {
      logger.debug({ surgeryId: patientCase.surgeries[0] }, "Surgery date not found for relative date calculation");
      return null;
    }

    // Calculate the relative date: surgery date + (postopWeek * 7 days)
    const relativeDate = new Date(surgery.surgeryDate);
    relativeDate.setDate(relativeDate.getDate() + postopWeek * 7);

    logger.debug(
      {
        surgeryDate: surgery.surgeryDate,
        postopWeek,
        calculatedDate: relativeDate,
      },
      "Calculated relative creation date for form based on postopWeek",
    );

    return relativeDate;
  } catch (error) {
    logger.debug({ error, consultationId, postopWeek }, "Error calculating relative creation date for form");
    return null;
  }
}

export class FormService {
  async getAllForms(): Promise<ServiceResponse<Form[] | null>> {
    try {
      const forms = await formRepository.getAllForms();
      return ServiceResponse.success("Forms found", forms);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving forms.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFormById(id: string): Promise<ServiceResponse<Form | null>> {
    try {
      const form = await formRepository.getFormById(id);
      if (!form) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Form found", form);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createForm(formData: Form, userContext?: UserContext): Promise<ServiceResponse<Form | null>> {
    try {
      // Set the form start time if not already provided
      if (!formData.formStartTime) {
        formData.formStartTime = new Date();
      }

      const newForm = await formRepository.createForm(formData);

      // Log form creation activity
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: "Created form",
          type: "formOpen",
          details: `Form ID: ${newForm._id}, Template: ${newForm.formTemplateId}`,
        });
      }

      return ServiceResponse.created("Form created successfully", newForm);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while creating the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update form data, completion status, and scoring
   * 
   * FRONTEND DATA STRUCTURE (FormSubmissionData):
   * Frontend sends an updateFormRequest with:
   * - formData: Raw form answers (maps to frontend's FormSubmissionData.rawData)
   * - scoring: Calculated scoring data (maps to FormSubmissionData.scoring)
   * - formFillStatus: Completion status (maps to FormSubmissionData.isComplete)
   * - completedAt: Timestamp when completed (maps to FormSubmissionData.completedAt)
   * 
   * BACKEND STORAGE:
   * - formData: Stored as Form.formData (the raw answers)
   * - scoring: Stored as Form.scoring (the calculated scores)
   * - formFillStatus: Stored as Form.formFillStatus (draft/incomplete/completed)
   * - completedAt: Stored as Form.completedAt (timestamp)
   * 
   * The backend respects what the frontend sends and does not recalculate scores.
   * All scoring logic resides in the frontend plugins.
   */
  async updateForm(
    formId: string,
    updatedForm: Partial<Form> & { code?: string },
    userContext?: UserContext,
  ): Promise<ServiceResponse<Form | null>> {
    try {
      // // Debug: Log what service received
      // console.debug("=== BACKEND SERVICE: Received data ===");
      // console.debug("formId:", formId);
      // console.debug("updatedForm type:", typeof updatedForm);
      // console.debug("updatedForm keys:", Object.keys(updatedForm));
      // console.debug("updatedForm:", JSON.stringify(updatedForm, null, 2));
      // console.debug("updatedForm.formData:", JSON.stringify(updatedForm.formData, null, 2));
      // console.debug("updatedForm.scoring:", JSON.stringify(updatedForm.scoring, null, 2));
      // console.debug("======================================");

      // get the form by id
      const existingForm = await formRepository.getFormById(formId);
      if (!existingForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }

      // AUTHORIZATION: Verify access code if provided
      // This prevents unauthorized users from randomly updating forms
      if (updatedForm.code) {
        try {
          const codeModule = await import("@/api/code/codeRepository.js");
          const codeRepository = new codeModule.CodeRepository();

          // Find the code and verify it's activated
          const codeDoc = await codeRepository.findByCode(updatedForm.code);
          if (!codeDoc || !codeDoc.consultationId) {
            return ServiceResponse.failure(
              "Invalid or inactive access code",
              null,
              StatusCodes.FORBIDDEN,
            );
          }

          // Verify the code's consultation matches this form's consultation
          const codeConsultationId = typeof codeDoc.consultationId === 'string'
            ? codeDoc.consultationId
            : codeDoc.consultationId.toString();
          const formConsultationId = typeof existingForm.consultationId === 'string'
            ? existingForm.consultationId
            : existingForm.consultationId?._id.toString();

          if (codeConsultationId !== formConsultationId) {
            return ServiceResponse.failure(
              "Access code does not grant permission to edit this form",
              null,
              StatusCodes.FORBIDDEN,
            );
          }

          logger.debug(
            { code: updatedForm.code, formId, consultationId: formConsultationId },
            "✅ Access code verified successfully"
          );
        } catch (error) {
          logger.error({ error, code: updatedForm.code }, "Error verifying access code");
          return ServiceResponse.failure(
            "Failed to verify access code",
            null,
            StatusCodes.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Extract patientFormData from the updatedForm if it exists
      // Frontend sends PatientFormData structure with:
      // - rawFormData: the raw form answers (sections->questions)
      // - subscales: subscale scores
      // - totalScore: total score
      // - fillStatus: completion status ("draft" | "incomplete" | "complete")
      // - completedAt: timestamp when completed
      // - beginFill: timestamp when form filling began
      let patientFormData: any;

      patientFormData = updatedForm.patientFormData ? updatedForm.patientFormData : undefined;

      console.log("=== BACKEND SERVICE: After extraction ===");
      console.log("patientFormData extracted:", JSON.stringify(patientFormData, null, 2));
      console.log("patientFormData type:", typeof patientFormData);
      console.log("patientFormData keys:", patientFormData && typeof patientFormData === "object" ? Object.keys(patientFormData) : "N/A");
      console.log("=========================================");

      // Prepare update data
      const updateData: Partial<Form> = {};

      // Handle form timing data
      if (updatedForm.completionTimeSeconds !== undefined) {
        updateData.completionTimeSeconds = updatedForm.completionTimeSeconds;
      }

      if (updatedForm.formStartTime !== undefined) {
        updateData.formStartTime = updatedForm.formStartTime;
      }

      if (updatedForm.formEndTime !== undefined) {
        updateData.formEndTime = updatedForm.formEndTime;
      }

      // === SCORE CALCULATION POLICY ===
      // The backend does NOT calculate or normalize any form scores (e.g., MOXFQ normalization).
      // All score calculations must be performed on the frontend and passed in patientFormData.
      // The backend only stores the provided score value.
      // ===============================

      // Handle patientFormData: this includes fillStatus, completedAt, and all form data
      if (patientFormData) {
        updateData.patientFormData = patientFormData;
        updateData.updatedAt = new Date();

        // Set formEndTime if completed and not already set
        if (patientFormData.fillStatus === "complete" && !existingForm.formEndTime && !updateData.formEndTime) {
          updateData.formEndTime = new Date();
        }

        logger.debug({ fillStatus: patientFormData.fillStatus }, "Using fillStatus from frontend");
      } else {
        // If no patientFormData provided, just update the timestamp
        updateData.updatedAt = new Date();
      }

      // Calculate relative creation date for kiosk users based on postopWeek
      // This ensures forms submitted by kiosk users have a createdAt date relative to their consultation date
      if (userContext?.userId) {
        try {
          const userModule = await import("@/api/user/userModel.js");
          const userModel = userModule.userModel;
          const user = await userModel.findById(userContext.userId).select("postopWeek").lean() as any;

          if (user?.postopWeek && typeof user.postopWeek === 'number') {
            const relativeDate = await calculateRelativeCreatedAtDate(
              typeof existingForm.consultationId === 'string'
                ? existingForm.consultationId
                : existingForm.consultationId?.toString(),
              user.postopWeek,
            );

            if (relativeDate) {
              // For kiosk users, set createdAt to the relative date (surgery date + postopWeek)
              // This is done only if the form doesn't already have a createdAt
              //BUGFIX: Always update createdAt to reflect postopWeek date
              updateData.createdAt = relativeDate;
              // Also update the updatedAt to match the relative date for consistency
              updateData.updatedAt = relativeDate;
              // Update completedAt in patientFormData if it exists
              if (updateData.patientFormData && updateData.patientFormData.completedAt) {
                updateData.patientFormData.completedAt = relativeDate;
              }

              logger.info(
                {
                  formId,
                  postopWeek: user.postopWeek,
                  relativeDate,
                  userId: userContext.userId,
                },
                "📅 Form timestamps updated to relative date based on postopWeek",
              );
            }
          }
        } catch (error) {
          logger.debug({ error, userId: userContext.userId }, "Could not calculate relative creation date for form");
          // Fall through - use default timestamps if calculation fails
        }
      }

      // Update the form data - patientFormData is handled above
      // If no new patientFormData provided, keep existing data
      if (!updateData.patientFormData && existingForm.patientFormData) {
        // Keep existing patientFormData if no update provided
        // This ensures we don't accidentally clear the data
      }

      // Calculate completion time from patientFormData.beginFill and patientFormData.completedAt
      if (
        !updateData.completionTimeSeconds &&
        patientFormData?.beginFill &&
        patientFormData?.completedAt
      ) {
        const startTime = new Date(patientFormData.beginFill);
        const endTime = new Date(patientFormData.completedAt);
        const diffMs = endTime.getTime() - startTime.getTime();
        updateData.completionTimeSeconds = Math.round(diffMs / 1000);
        logger.debug(
          { beginFill: patientFormData.beginFill, completedAt: patientFormData.completedAt, completionTimeSeconds: updateData.completionTimeSeconds },
          "Calculated completion time from patientFormData timestamps"
        );
      }
      // Fallback: Calculate completion time if not provided but start and end times are available
      else if (
        !updateData.completionTimeSeconds &&
        existingForm.formStartTime &&
        (updateData.formEndTime || existingForm.formEndTime)
      ) {
        const endTime = updateData.formEndTime || existingForm.formEndTime!;
        const diffMs = endTime.getTime() - existingForm.formStartTime.getTime();
        updateData.completionTimeSeconds = Math.round(diffMs / 1000);
      }

      // Scoring data is now part of patientFormData (subscales and totalScore)
      // The frontend is responsible for all scoring calculations
      // The backend only stores the provided score values within patientFormData

      // console.log("=== BACKEND SERVICE: Final updateData ===");
      // console.log("updateData:", JSON.stringify(updateData, null, 2));
      // console.log("updateData.patientFormData:", JSON.stringify(updateData.patientFormData, null, 2));
      // console.log("=========================================");

      // === FORM VERSIONING ===
      // Create version backup before updating if there's actual data change
      if (updateData.patientFormData && userContext?.userId) {
        const changeNotes = updatedForm.code
          ? "Form updated via patient access code"
          : "Form updated";

        // Create version backup
        await formVersionService.createVersionBackup(
          existingForm,
          updateData,
          userContext.userId,
          changeNotes
        );

        // Increment version number
        updateData.currentVersion = (existingForm.currentVersion || 1) + 1;
      }
      // =======================

      const response = await formRepository.updateForm(formId, updateData);

      // Log form update/submission activity
      if (userContext) {
        const fillStatus = updateData.patientFormData?.fillStatus || "draft";
        const isCompleted = fillStatus === "complete";
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: isCompleted ? "Submitted form" : "Updated form",
          type: isCompleted ? "formSubmit" : "formOpen",
          details: `Form ID: ${formId}, Status: ${fillStatus}, Template: ${existingForm.formTemplateId}`,
        });
      }

      return ServiceResponse.success("Form updated successfully", response);
    } catch (error) {
      logger.error({ error }, "Error in updateForm service");
      return ServiceResponse.failure(
        "An error occurred while updating the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteForm(id: string): Promise<ServiceResponse<Form | null>> {
    try {
      const deletedForm = await formRepository.deleteForm(id);
      if (!deletedForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Form deleted successfully", null);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while deleting the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Soft delete a form by setting deletedAt timestamp
   * @param id - Form ID
   * @param deletionReason - Reason for deletion
   * @param userContext - User context for activity logging
   * @returns Updated form with deletedAt set
   */
  async softDeleteForm(
    id: string,
    deletionReason: string,
    userContext?: UserContext
  ): Promise<ServiceResponse<Form | null>> {
    try {
      const form = await formRepository.getFormById(id);
      if (!form) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }

      const deletedBy = userContext?.userId || "";
      const softDeletedForm = await formRepository.softDeleteForm(id, deletedBy, deletionReason);

      if (!softDeletedForm) {
        return ServiceResponse.failure("Failed to soft delete form", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Log the soft delete activity
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Soft deleted form: ${id}`,
          type: "warning",
          details: `Form ID: ${id}, Template: ${form.formTemplateId}, Reason: ${deletionReason}`,
        });
      }

      return ServiceResponse.success("Form soft deleted successfully", softDeletedForm);
    } catch (error) {
      logger.error({ error }, "Error in softDeleteForm service");
      return ServiceResponse.failure(
        "An error occurred while soft deleting the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Restore a soft deleted form
   * @param id - Form ID
   * @param userContext - User context for activity logging
   * @returns Restored form
   */
  async restoreForm(
    id: string,
    userContext?: UserContext
  ): Promise<ServiceResponse<Form | null>> {
    try {
      const restoredForm = await formRepository.restoreForm(id);

      if (!restoredForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }

      // Log the restore activity
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Restored form: ${id}`,
          type: "info",
          details: `Form ID: ${id}, Template: ${restoredForm.formTemplateId}`,
        });
      }

      return ServiceResponse.success("Form restored successfully", restoredForm);
    } catch (error) {
      logger.error({ error }, "Error in restoreForm service");
      return ServiceResponse.failure(
        "An error occurred while restoring the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all soft deleted forms with pagination
   * @param options - Pagination options
   * @returns Paginated list of soft deleted forms
   */
  async getDeletedForms(options: { page?: number; limit?: number } = {}): Promise<ServiceResponse<{
    forms: Form[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>> {
    try {
      const result = await formRepository.findAllDeletedForms(options);
      return ServiceResponse.success("Deleted forms retrieved successfully", result);
    } catch (error) {
      logger.error({ error }, "Error in getDeletedForms service");
      return ServiceResponse.failure(
        "An error occurred while retrieving deleted forms.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const formService = new FormService();
