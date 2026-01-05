import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { FormTemplate, FormTemplateArray, FormTemplateListSchema } from "./formTemplateModel";
import { FormTemplateRepository } from "./formTemplateRepository";

export class FormTemplateService {
  private formTemplateRepository: FormTemplateRepository;
  constructor(formTemplateRepository: FormTemplateRepository = new FormTemplateRepository()) {
    this.formTemplateRepository = formTemplateRepository;
  }
  /**
   * get all form templates
   * @returns
   */
  async getFormTemplates(): Promise<ServiceResponse<FormTemplate[] | null>> {
    try {
      const formTemplates = await this.formTemplateRepository.getAllTemplates();
      // Return empty array with success status (consistent with blueprints API)
      if (!formTemplates || formTemplates.length === 0) {
        return ServiceResponse.success<FormTemplate[]>("Form templates found", []);
      }

      const validationResult = FormTemplateArray.safeParse(formTemplates);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.errors }, "Validation error");
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

  /**
   * get form template by id
   * @param templateId
   * @returns
   */
  async getFormTemplateById(templateId: string): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      const formTemplate = await this.formTemplateRepository.getTemplateById(templateId);
      if (!formTemplate) {
        return ServiceResponse.failure("Form template not found", null, StatusCodes.NOT_FOUND);
      }

      const validationResult = FormTemplate.safeParse(formTemplate);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.errors }, "Validation error");
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

  /**
   * return all form templates in the short list variant
   * @description this is a short list of form templates that are used in the form template list
   * @returns
   */
  async getFormTemplatesShortlist(): Promise<ServiceResponse<FormTemplate[] | null>> {
    try {
      const formTemplates = await this.formTemplateRepository.getFormTemplatesShortlist();
      // Return empty array with success status (consistent with blueprints API)
      if (!formTemplates || formTemplates.length === 0) {
        return ServiceResponse.success<FormTemplate[]>("Form templates found", []);
      }
      const validationResult = FormTemplateListSchema.safeParse(formTemplates);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.errors }, "Validation error");
        return ServiceResponse.failure(
          "Invalid form template data as response",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }
      return ServiceResponse.success<FormTemplate[]>("Form templates found", formTemplates);
    } catch (ex) {
      const errorMessage = `Error getting form templates short list: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while retrieving form templates",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * update form template by id
   * @param templateId
   * @param templateData
   * @returns
   */
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
        logger.debug({ errors: validationResult.error.errors }, "Validation error");
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

  /**
   * create form template
   * @param templateData
   * @returns
   */
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
  /**
   * delete form template by id
   * @param templateId
   * @returns
   */
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
