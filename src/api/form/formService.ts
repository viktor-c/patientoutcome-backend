import { ServiceResponse } from "@/common/models/serviceResponse";
import { activityLogService } from "@/common/services/activityLogService";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { CustomFormDataSchema } from "../formtemplate/formTemplateModel";
import type { Form } from "./formModel";
import { formRepository } from "./formRepository";

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

  async updateForm(
    formId: string,
    updatedForm: Partial<Form>,
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

      // Extract formData from the updatedForm if it exists
      // Handle the case where the client sends { body: { formData: {...} } } or just { formData: {...} }
      let formData: any;

      if (updatedForm.formData) {
        // Check if formData has a 'body' wrapper (incorrect structure from old API client)
        if (typeof updatedForm.formData === "object" && "body" in updatedForm.formData) {
          const nested = (updatedForm.formData as any).body;
          // If body.formData exists, use that, otherwise use body directly
          formData = nested?.formData || nested;
          console.log("⚠️  WARNING: Detected nested body structure in formData");
        } else {
          formData = updatedForm.formData;
        }
      } else {
        // Fallback to using updatedForm directly (for backward compatibility)
        formData = updatedForm;
      }

      console.log("=== BACKEND SERVICE: After extraction ===");
      console.log("formData extracted:", JSON.stringify(formData, null, 2));
      console.log("formData type:", typeof formData);
      console.log("formData keys:", formData && typeof formData === "object" ? Object.keys(formData) : "N/A");
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
      // All score calculations must be performed on the frontend and passed as updatedForm.score.
      // The backend only stores the provided score value.
      // ===============================
      // Check if the fields in the formData are completely filled (for fill status only)
      const incompleteFields = [];
      if (formData && typeof formData === "object") {
        const validationResult = CustomFormDataSchema.safeParse(formData);
        logger.debug({ isValid: validationResult.success }, "formService.ts Form validation");
        for (const [sectionName, answerValues] of Object.entries(formData)) {
          if (typeof answerValues === "object" && answerValues !== null) {
            for (const [question, answer] of Object.entries(answerValues)) {
              if (answer === null || answer === undefined || answer === "") {
                incompleteFields.push(`${sectionName}.${question}`);
              }
            }
          }
        }
      }

      if (incompleteFields.length > 0) {
        logger.debug({ incompleteFields }, "formService.ts Form validation failed");
        updateData.formFillStatus = "incomplete";
        updateData.updatedAt = new Date();
      } else {
        logger.debug("formService.ts Form validation passed, all fields are complete.");
        updateData.formFillStatus = "completed";
        updateData.updatedAt = new Date();
        updateData.completedAt = new Date();
        if (!existingForm.formEndTime) {
          updateData.formEndTime = new Date();
        }
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
              // Also update the updatedAt and completedAt to match the relative date for consistency
              updateData.updatedAt = relativeDate;
              if (updateData.completedAt) {
                updateData.completedAt = relativeDate;
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

      // Update the form data
      // Only use the properly extracted formData, ignore any direct questionnaire properties on updatedForm
      if (formData && typeof formData === "object" && Object.keys(formData).length > 0) {
        // Ensure we're not including the malformed 'body' wrapper
        if ("body" in formData) {
          console.log("⚠️  WARNING: Removing body wrapper from formData before saving");
          const { body, ...cleanFormData } = formData;
          updateData.formData = Object.keys(cleanFormData).length > 0 ? cleanFormData : body?.formData || body;
        } else {
          updateData.formData = formData;
        }
      }

      // Calculate completion time if not provided but start and end times are available
      if (
        !updateData.completionTimeSeconds &&
        existingForm.formStartTime &&
        (updateData.formEndTime || existingForm.formEndTime)
      ) {
        const endTime = updateData.formEndTime || existingForm.formEndTime!;
        const diffMs = endTime.getTime() - existingForm.formStartTime.getTime();
        updateData.completionTimeSeconds = Math.round(diffMs / 1000);
      }

      // Store the scoring data provided by the frontend (do not calculate here)
      // The frontend is responsible for all scoring calculations, including MOXFQ normalization
      if (updatedForm.scoring && typeof updatedForm.scoring === "object") {
        updateData.scoring = updatedForm.scoring;
      }
      // If no scoring is provided, do not set/update the scoring field
      // This ensures backend never overwrites frontend-calculated scores

      // console.log("=== BACKEND SERVICE: Final updateData ===");
      // console.log("updateData:", JSON.stringify(updateData, null, 2));
      // console.log("updateData.formData:", JSON.stringify(updateData.formData, null, 2));
      // console.log("updateData.scoring:", JSON.stringify(updateData.scoring, null, 2));
      // console.log("=========================================");

      const response = await formRepository.updateForm(formId, updateData);

      // Log form update/submission activity
      if (userContext) {
        const isCompleted = updateData.formFillStatus === "completed";
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: isCompleted ? "Submitted form" : "Updated form",
          type: isCompleted ? "formSubmit" : "formOpen",
          details: `Form ID: ${formId}, Status: ${updateData.formFillStatus || "in-progress"}, Template: ${existingForm.formTemplateId}`,
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
