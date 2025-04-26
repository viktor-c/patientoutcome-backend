import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { FormTemplate, FormTemplateArray } from "./formTemplateModel";
import { FormTemplateRepository } from "./formTemplateRepository";

export class FormTemplateService {
  private formTemplateRepository: FormTemplateRepository;
  constructor(formTemplateRepository: FormTemplateRepository = new FormTemplateRepository()) {
    this.formTemplateRepository = formTemplateRepository;
  }
  async getFormTemplates(): Promise<ServiceResponse<FormTemplate[] | null>> {
    try {
      const formTemplates = await this.formTemplateRepository.getAllTemplates();
      if (!formTemplates || formTemplates.length === 0) {
        return ServiceResponse.failure("No form templates found", null, StatusCodes.NOT_FOUND);
      }

      const validationResult = FormTemplateArray.safeParse(formTemplates);
      if (validationResult.success === false) {
        console.debug("Validation error:", validationResult.error.errors);
        return ServiceResponse.failure(
          "Invalid form template data as response",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      return ServiceResponse.success<FormTemplate[]>("Form templates found", formTemplates);
    } catch (ex) {
      const errorMessage = `Error getting form templates: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while retrieving form templates",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFormTemplateById(templateId: string): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      const formTemplate = await this.formTemplateRepository.getTemplateById(templateId);
      if (!formTemplate) {
        return ServiceResponse.failure("Form template not found", null, StatusCodes.NOT_FOUND);
      }

      const validationResult = FormTemplate.safeParse(formTemplate);
      if (validationResult.success === false) {
        console.debug("Validation error:", validationResult.error.errors);
        return ServiceResponse.failure(
          "Invalid form template data as response",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      return ServiceResponse.success<FormTemplate>("Form template found", formTemplate);
    } catch (ex) {
      const errorMessage = `Error getting form template: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while retrieving form template",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateFormTemplate(
    templateId: string,
    templateData: Partial<FormTemplate>,
  ): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      const updatedTemplate = await this.formTemplateRepository.updateTemplate(templateId, templateData);

      if (!updatedTemplate) {
        return ServiceResponse.failure("Form template not found", null, StatusCodes.NOT_FOUND);
      }

      const validationResult = FormTemplate.safeParse(updatedTemplate);
      if (validationResult.success === false) {
        console.debug("Validation error:", validationResult.error.errors);
        return ServiceResponse.failure(
          "Invalid form template data as response",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      return ServiceResponse.success<FormTemplate>("Form template updated", updatedTemplate);
    } catch (ex) {
      const errorMessage = `Error updating form template: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while updating form template",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createFormTemplate(templateData: FormTemplate): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      const formTemplate = await this.formTemplateRepository.createTemplate(templateData);
      return ServiceResponse.success<FormTemplate>("Form template created", formTemplate, StatusCodes.CREATED);
    } catch (ex) {
      const errorMessage = `Error creating form template: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while creating form template",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFormTemplateById(templateId: string): Promise<ServiceResponse<boolean>> {
    try {
      const isDeleted = await this.formTemplateRepository.deleteTemplate(templateId);
      if (!isDeleted) {
        return ServiceResponse.failure("Form template not found", false, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<boolean>("Form template deleted", isDeleted, StatusCodes.NO_CONTENT);
    } catch (ex) {
      const errorMessage = `Error deleting form template: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while deleting form template",
        false,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const formTemplateService = new FormTemplateService();
