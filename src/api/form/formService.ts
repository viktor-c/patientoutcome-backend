import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { CustomFormDataSchema } from "../formtemplate/formTemplateModel";
import type { Form } from "./formModel";
import { formRepository } from "./formRepository";

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

  async createForm(formData: Form): Promise<ServiceResponse<Form | null>> {
    try {
      // Set the form start time if not already provided
      if (!formData.formStartTime) {
        formData.formStartTime = new Date();
      }

      const newForm = await formRepository.createForm(formData);
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
   *
   * @param formId
   * @param updatedForm this only has the data answered for this form, nothing else.
   * @returns
   */
  async updateForm(formId: string, updatedForm: Partial<Form>): Promise<ServiceResponse<Form | null>> {
    try {
      // get the form by id
      const existingForm = await formRepository.getFormById(formId);
      if (!existingForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }

      // Extract formData from the updatedForm if it exists
      const formData = updatedForm.formData || updatedForm;

      // Handle form timing data
      if (updatedForm.completionTimeSeconds) {
        existingForm.completionTimeSeconds = updatedForm.completionTimeSeconds;
      }

      if (updatedForm.formStartTime) {
        existingForm.formStartTime = updatedForm.formStartTime;
      }

      if (updatedForm.formEndTime) {
        existingForm.formEndTime = updatedForm.formEndTime;
      }

      // first check if the fields in the formData are completely filled
      const incompleteFields = [];
      let score = 0;

      if (formData && typeof formData === "object") {
        const validationResult = CustomFormDataSchema.safeParse(formData);
        logger.debug({ isValid: validationResult.success }, "formService.ts Form validation");

        // Iterate through each questionnaire section
        for (const [sectionName, answerValues] of Object.entries(formData)) {
          if (typeof answerValues === "object" && answerValues !== null) {
            for (const [question, answer] of Object.entries(answerValues)) {
              if (answer === null || answer === undefined || answer === "") {
                incompleteFields.push(`${sectionName}.${question}`);
              } else {
                const numericAnswer = Number(answer);
                if (!Number.isNaN(numericAnswer)) {
                  score += numericAnswer;
                }
              }
            }
          }
        }
      }

      if (incompleteFields.length > 0) {
        logger.debug({ incompleteFields }, "formService.ts Form validation failed");
        existingForm.formFillStatus = "incomplete";
        existingForm.updatedAt = new Date(); // update updatedAt to current date
      } else {
        logger.debug("formService.ts Form validation passed, all fields are complete.");
        existingForm.formFillStatus = "completed";
        existingForm.updatedAt = new Date(); // update updatedAt to current date
        existingForm.completedAt = new Date(); // update completedAt to current date

        // Set form end time if not already set and the form is being completed
        if (!existingForm.formEndTime) {
          existingForm.formEndTime = new Date();
        }
      }

      // Update the form data
      if (updatedForm.formData) {
        existingForm.formData = updatedForm.formData;
      } else if (formData) {
        existingForm.formData = formData;
      }

      // Calculate completion time if not provided but start and end times are available
      if (!existingForm.completionTimeSeconds && existingForm.formStartTime && existingForm.formEndTime) {
        const diffMs = existingForm.formEndTime.getTime() - existingForm.formStartTime.getTime();
        existingForm.completionTimeSeconds = Math.round(diffMs / 1000);
      }

      // update the score
      existingForm.score = score;
      const response = await formRepository.updateForm(formId, existingForm);
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
}

export const formService = new FormService();
