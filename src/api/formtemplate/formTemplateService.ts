import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import {
  FormTemplate,
  FormTemplateArray,
  FormTemplateListSchema,
  GetFormTemplatesQuerySchema,
} from "./formTemplateModel";
import { type DepartmentFormTemplate } from "./departmentFormTemplateModel";
import { FormTemplateRepository } from "./formTemplateRepository";

// Infer the query type from the schema
type GetFormTemplatesQuery = z.infer<typeof GetFormTemplatesQuerySchema>;

/**
 * User context for access control
 */
export interface UserContext {
  userId: string;
  roles: string[];
  departments: string[];
}

export class FormTemplateService {
  private formTemplateRepository: FormTemplateRepository;
  constructor(formTemplateRepository: FormTemplateRepository = new FormTemplateRepository()) {
    this.formTemplateRepository = formTemplateRepository;
  }

  /**
   * Check if user has admin or developer role
   */
  private hasAdminAccess(userContext: UserContext): boolean {
    return userContext.roles.includes("admin") || userContext.roles.includes("developer");
  }

  /**
   * Check if user can access a specific template based on department mappings
   */
  private async canAccessTemplate(templateId: string, userContext: UserContext): Promise<boolean> {
    // Admin/developer can access all
    if (this.hasAdminAccess(userContext)) {
      return true;
    }

    // Check if template is mapped to any of user's departments
    for (const deptId of userContext.departments) {
      const mapping = await this.formTemplateRepository.getDepartmentMapping(deptId);
      if (mapping && mapping.formTemplateIds.includes(templateId)) {
        return true;
      }
    }

    return false;
  }
  /**
   * Get form templates with optional filtering and access control
   * @param query - Optional query parameters (id, ids, departmentId)
   * @param userContext - User context for access control
   * @returns
   */
  async getFormTemplates(
    query: GetFormTemplatesQuery = {},
    userContext: UserContext,
  ): Promise<ServiceResponse<FormTemplate[] | null>> {
    try {
      let formTemplates: FormTemplate[];

      // Process query parameters
      const options: { ids?: string[]; departmentId?: string } = {};

      // Handle single id or array of ids
      if (query.id) {
        options.ids = Array.isArray(query.id) ? query.id : [query.id];
      } else if (query.ids) {
        options.ids = query.ids;
      }

      // Handle department filter
      if (query.departmentId) {
        options.departmentId = query.departmentId;
      }

      // For regular users (non-admin/developer), enforce department filtering
      if (!this.hasAdminAccess(userContext)) {
        // If no specific department requested, get templates from all user's departments
        if (!options.departmentId) {
          // Fetch templates for all user departments
          const templatesByDepartment = await Promise.all(
            userContext.departments.map((deptId) => this.formTemplateRepository.getTemplatesByDepartment(deptId)),
          );

          // Flatten and deduplicate template IDs
          const templateIds = [
            ...new Set(
              templatesByDepartment.flatMap((templates) => templates.map((t) => (t._id?.toString() || "")).filter(id => id !== ""))
            ),
          ];

          if (templateIds.length === 0) {
            return ServiceResponse.success<FormTemplate[]>("Form templates found", []);
          }

          options.ids = templateIds;
        }
        // If department specified, verify user belongs to it
        else if (!userContext.departments.includes(options.departmentId)) {
          return ServiceResponse.failure(
            "Access denied: You don't have access to this department",
            null,
            StatusCodes.FORBIDDEN,
          );
        }
      }

      // Fetch templates based on options
      formTemplates = await this.formTemplateRepository.getTemplates(options);

      // Return empty array with success status
      if (!formTemplates || formTemplates.length === 0) {
        return ServiceResponse.success<FormTemplate[]>("Form templates found", []);
      }

      // Validate response
      const validationResult = FormTemplateArray.safeParse(formTemplates);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.issues }, "Validation error");
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
   * Get form template by id with access control
   * @param templateId
   * @param userContext - User context for access control
   * @returns
   */
  async getFormTemplateById(
    templateId: string,
    userContext: UserContext,
  ): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      const formTemplate = await this.formTemplateRepository.getTemplateById(templateId);
      if (!formTemplate) {
        return ServiceResponse.failure("Form template not found", null, StatusCodes.NOT_FOUND);
      }

      // Check access for regular users
      const canAccess = await this.canAccessTemplate(templateId, userContext);
      if (!canAccess) {
        return ServiceResponse.failure(
          "Access denied: You don't have access to this form template",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const validationResult = FormTemplate.safeParse(formTemplate);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.issues }, "Validation error");
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
   * Return all form templates in the short list variant with access control
   * @description this is a short list of form templates that are used in the form template list
   * @param userContext - User context for access control
   * @returns
   */
  async getFormTemplatesShortlist(userContext: UserContext): Promise<ServiceResponse<FormTemplate[] | null>> {
    try {
      let formTemplates: FormTemplate[];

      // For regular users, apply department filtering
      if (!this.hasAdminAccess(userContext)) {
        // Fetch templates for all user departments
        const templatesByDepartment = await Promise.all(
          userContext.departments.map((deptId) => this.formTemplateRepository.getTemplatesByDepartment(deptId)),
        );

        // Flatten and deduplicate
        const templateMap = new Map<string, FormTemplate>();
        templatesByDepartment.flat().forEach((template) => {
          if (template._id) {
            templateMap.set(template._id.toString(), template);
          }
        });

        formTemplates = Array.from(templateMap.values());
      } else {
        // Admin/developer gets all templates
        formTemplates = await this.formTemplateRepository.getFormTemplatesShortlist();
      }

      // Return empty array with success status
      if (!formTemplates || formTemplates.length === 0) {
        return ServiceResponse.success<FormTemplate[]>("Form templates found", []);
      }

      const validationResult = FormTemplateListSchema.safeParse(formTemplates);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.issues }, "Validation error");
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
   * Update form template by id (admin/developer only)
   * @param templateId
   * @param templateData
   * @param userContext - User context for authorization
   * @returns
   */
  async updateFormTemplate(
    templateId: string,
    templateData: Partial<FormTemplate>,
    userContext: UserContext,
  ): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      // Only admin/developer can update templates
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can update form templates",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const updatedTemplate = await this.formTemplateRepository.updateTemplate(templateId, templateData);

      if (!updatedTemplate) {
        return ServiceResponse.failure("Form template not found", null, StatusCodes.NOT_FOUND);
      }

      const validationResult = FormTemplate.safeParse(updatedTemplate);
      if (validationResult.success === false) {
        logger.debug({ errors: validationResult.error.issues }, "Validation error");
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
   * Create form template (admin/developer only)
   * @param templateData - Form template data (may include _id from frontend)
   * @param userContext - User context for authorization
   * @returns
   */
  async createFormTemplate(
    templateData: FormTemplate,
    userContext: UserContext,
  ): Promise<ServiceResponse<FormTemplate | null>> {
    try {
      // Only admin/developer can create templates
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can create form templates",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

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
   * Delete form template by id (admin/developer only)
   * @param templateId
   * @param userContext - User context for authorization
   * @returns
   */
  async deleteFormTemplateById(templateId: string, userContext: UserContext): Promise<ServiceResponse<boolean>> {
    try {
      // Only admin/developer can delete templates
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can delete form templates",
          false,
          StatusCodes.FORBIDDEN,
        );
      }

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

  /**
   * Get department-formtemplate mapping (admin/developer only)
   * @param departmentId
   * @param userContext - User context for authorization
   * @returns
   */
  async getDepartmentMapping(
    departmentId: string,
    userContext: UserContext,
  ): Promise<ServiceResponse<DepartmentFormTemplate | null>> {
    try {
      // Only admin/developer can view mappings
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can view department mappings",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const mapping = await this.formTemplateRepository.getDepartmentMapping(departmentId);
      if (!mapping) {
        return ServiceResponse.failure("Department mapping not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success<DepartmentFormTemplate>("Department mapping found", mapping);
    } catch (ex) {
      const errorMessage = `Error getting department mapping: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while retrieving department mapping",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set department-formtemplate mapping (admin/developer only)
   * @param departmentId
   * @param formTemplateIds
   * @param userContext - User context for authorization
   * @returns
   */
  async setDepartmentMapping(
    departmentId: string,
    formTemplateIds: string[],
    userContext: UserContext,
  ): Promise<ServiceResponse<DepartmentFormTemplate | null>> {
    try {
      // Only admin/developer can set mappings
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can set department mappings",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const mapping = await this.formTemplateRepository.setDepartmentMapping(
        departmentId,
        formTemplateIds,
        userContext.userId,
      );

      return ServiceResponse.success<DepartmentFormTemplate>("Department mapping set", mapping);
    } catch (ex) {
      const errorMessage = `Error setting department mapping: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while setting department mapping",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add form templates to department mapping (admin/developer only)
   * @param departmentId
   * @param formTemplateIds
   * @param userContext - User context for authorization
   * @returns
   */
  async addTemplatesToDepartment(
    departmentId: string,
    formTemplateIds: string[],
    userContext: UserContext,
  ): Promise<ServiceResponse<DepartmentFormTemplate | null>> {
    try {
      // Only admin/developer can modify mappings
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can modify department mappings",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const mapping = await this.formTemplateRepository.addTemplatesToDepartment(
        departmentId,
        formTemplateIds,
        userContext.userId,
      );

      if (!mapping) {
        return ServiceResponse.failure("Department mapping not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success<DepartmentFormTemplate>("Templates added to department", mapping);
    } catch (ex) {
      const errorMessage = `Error adding templates to department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while adding templates to department",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove form templates from department mapping (admin/developer only)
   * @param departmentId
   * @param formTemplateIds
   * @param userContext - User context for authorization
   * @returns
   */
  async removeTemplatesFromDepartment(
    departmentId: string,
    formTemplateIds: string[],
    userContext: UserContext,
  ): Promise<ServiceResponse<DepartmentFormTemplate | null>> {
    try {
      // Only admin/developer can modify mappings
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can modify department mappings",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      const mapping = await this.formTemplateRepository.removeTemplatesFromDepartment(
        departmentId,
        formTemplateIds,
        userContext.userId,
      );

      if (!mapping) {
        return ServiceResponse.failure("Department mapping not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success<DepartmentFormTemplate>("Templates removed from department", mapping);
    } catch (ex) {
      const errorMessage = `Error removing templates from department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while removing templates from department",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete department mapping (admin/developer only)
   * @param departmentId
   * @param userContext - User context for authorization
   * @returns
   */
  async deleteDepartmentMapping(
    departmentId: string,
    userContext: UserContext,
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Only admin/developer can delete mappings
      if (!this.hasAdminAccess(userContext)) {
        return ServiceResponse.failure(
          "Access denied: Only administrators can delete department mappings",
          false,
          StatusCodes.FORBIDDEN,
        );
      }

      const isDeleted = await this.formTemplateRepository.deleteDepartmentMapping(departmentId);
      if (!isDeleted) {
        return ServiceResponse.failure("Department mapping not found", false, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success<boolean>("Department mapping deleted", isDeleted);
    } catch (ex) {
      const errorMessage = `Error deleting department mapping: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occured while deleting department mapping",
        false,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const formTemplateService = new FormTemplateService();
