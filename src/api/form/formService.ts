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
      // first check if the fields in the formData are completely filled
      const incompleteFields = [];
      let score = 0;
      if (updatedForm) {
        logger.debug(
          "formService.ts Form validation: updatedForm.formData is ",
          CustomFormDataSchema.parse(updatedForm) ? "valid" : "invalid",
        );
        for (const [, answerValues] of Object.entries(updatedForm)) {
          if (typeof answerValues === "object" && answerValues !== null) {
            for (const [question, answer] of Object.entries(answerValues)) {
              if (answer === null || answer === undefined || answer === "") {
                incompleteFields.push(question);
              } else {
                const numericAnswer = Number.parseInt(answer as string);
                if (!Number.isNaN(numericAnswer)) {
                  score += numericAnswer;
                }
              }
            }
          }
        }
      }
      if (incompleteFields.length > 0) {
        logger.debug("formService.ts Form validation failed. Incomplete fields:", incompleteFields);
        existingForm.formFillStatus = "incomplete";
        existingForm.updatedAt = new Date(); // update updatedAt to current date
      } else {
        logger.debug("formService.ts Form validation passed, all fields are complete.");
        existingForm.formFillStatus = "completed";
        existingForm.updatedAt = new Date(); // update updatedAt to current date
        existingForm.completedAt = new Date(); // update completedAt to current date
      }
      existingForm.formData = updatedForm ? updatedForm : existingForm.formData; // update the form data
      // update the score
      existingForm.score = score;
      const response = await formRepository.updateForm(formId, existingForm);
      return ServiceResponse.success("Form updated successfully", response);
    } catch (error) {
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
