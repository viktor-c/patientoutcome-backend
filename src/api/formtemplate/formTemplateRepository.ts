import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import mongoose from "mongoose";
import { DepartmentFormTemplateModel, type DepartmentFormTemplate } from "./departmentFormTemplateModel";
import { type FormTemplate, FormTemplateModel } from "./formTemplateModel";

export interface GetTemplatesOptions {
  ids?: string | string[];
  departmentId?: string;
}

export class FormTemplateRepository {
  /**
   * Get all form templates (admin/developer access)
   */
  async getAllTemplates(): Promise<FormTemplate[]> {
    return FormTemplateModel.find().select("-__v").lean();
  }

  /**
   * Get form templates with filtering options
   * @param options - Filter options (ids, departmentId)
   */
  async getTemplates(options?: GetTemplatesOptions): Promise<FormTemplate[]> {
    if (!options || Object.keys(options).length === 0) {
      return this.getAllTemplates();
    }

    // If specific IDs requested
    if (options.ids) {
      const ids = Array.isArray(options.ids) ? options.ids : [options.ids];
      return FormTemplateModel.find({ _id: { $in: ids } }).select("-__v").lean();
    }

    // If department filter requested
    if (options.departmentId) {
      return this.getTemplatesByDepartment(options.departmentId);
    }

    return this.getAllTemplates();
  }

  /**
   * Get form templates for a specific department
   */
  async getTemplatesByDepartment(departmentId: string): Promise<FormTemplate[]> {
    const mapping = await DepartmentFormTemplateModel.findOne({ departmentId }).lean();
    
    if (!mapping || !mapping.formTemplateIds || mapping.formTemplateIds.length === 0) {
      return [];
    }

    return FormTemplateModel.find({ 
      _id: { $in: mapping.formTemplateIds } 
    }).select("-__v").lean();
  }

  async getTemplateById(templateId: string): Promise<FormTemplate | null> {
    return FormTemplateModel.findById(templateId).select("-__v").lean();
  }

  /**
   * Create form template - supports frontend-provided ObjectIds
   */
  async createTemplate(templateData: FormTemplate): Promise<FormTemplate> {
    // If frontend provides an _id, use it; otherwise MongoDB will generate one
    const data: any = { ...templateData };
    
    if (data._id && typeof data._id === 'string') {
      data._id = new mongoose.Types.ObjectId(data._id);
    }
    
    const formTemplate = new FormTemplateModel(data);
    return formTemplate.save();
  }

  async getFormTemplatesShortlist(): Promise<FormTemplate[]> {
    return FormTemplateModel.find().select("title description").lean();
  }

  async updateTemplate(templateId: string, templateData: Partial<FormTemplate>): Promise<FormTemplate | null> {
    return FormTemplateModel.findByIdAndUpdate(templateId, templateData, { new: true }).select("-__v").lean();
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = await FormTemplateModel.findByIdAndDelete(templateId).lean();
    return !!result;
  }

  // ****************************************************
  // Department-FormTemplate Mapping Methods
  // ****************************************************

  /**
   * Get department-formtemplate mapping
   */
  async getDepartmentMapping(departmentId: string): Promise<DepartmentFormTemplate | null> {
    return DepartmentFormTemplateModel.findOne({ departmentId }).lean();
  }

  /**
   * Create or update department-formtemplate mapping
   */
  async setDepartmentMapping(
    departmentId: string,
    formTemplateIds: string[],
    userId?: string
  ): Promise<DepartmentFormTemplate> {
    const existing = await DepartmentFormTemplateModel.findOne({ departmentId });

    if (existing) {
      return DepartmentFormTemplateModel.findOneAndUpdate(
        { departmentId },
        { 
          formTemplateIds,
          updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        },
        { new: true }
      ).lean() as Promise<DepartmentFormTemplate>;
    }

    const mapping = new DepartmentFormTemplateModel({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      formTemplateIds: formTemplateIds.map(id => new mongoose.Types.ObjectId(id)),
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    return mapping.save();
  }

  /**
   * Add form templates to department mapping
   * Returns null if mapping doesn't exist (use setDepartmentMapping to create)
   */
  async addTemplatesToDepartment(
    departmentId: string,
    formTemplateIds: string[],
    userId?: string
  ): Promise<DepartmentFormTemplate | null> {
    const mapping = await this.getDepartmentMapping(departmentId);

    if (!mapping) {
      return null;
    }

    const existingIds = mapping.formTemplateIds.map(id => id.toString());
    const newIds = formTemplateIds.filter(id => !existingIds.includes(id));
    const allIds = [...existingIds, ...newIds];

    return this.setDepartmentMapping(departmentId, allIds, userId);
  }

  /**
   * Remove form templates from department mapping
   */
  async removeTemplatesFromDepartment(
    departmentId: string,
    formTemplateIds: string[],
    userId?: string
  ): Promise<DepartmentFormTemplate | null> {
    const mapping = await this.getDepartmentMapping(departmentId);

    if (!mapping) {
      return null;
    }

    const removeSet = new Set(formTemplateIds);
    const remainingIds = mapping.formTemplateIds
      .map(id => id.toString())
      .filter(id => !removeSet.has(id));

    if (remainingIds.length === 0) {
      await DepartmentFormTemplateModel.deleteOne({ departmentId });
      return null;
    }

    return this.setDepartmentMapping(departmentId, remainingIds, userId);
  }

  /**
   * Delete department mapping
   */
  async deleteDepartmentMapping(departmentId: string): Promise<boolean> {
    const result = await DepartmentFormTemplateModel.deleteOne({ departmentId });
    return result.deletedCount > 0;
  }

  async createMockDataFormTemplate(allowInProduction: boolean = false): Promise<void> {
    try {
      // Ensure mock templates have unique _id values to prevent duplicate-key errors during insert
      const mockData = this.getMockFormTemplateData(allowInProduction);
      const ids = mockData.map((t) => (t as any)._id).filter(Boolean);
      const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
      if (dupes.length > 0) {
        const uniqueDupes = Array.from(new Set(dupes));
        logger.error({ duplicates: uniqueDupes }, "Duplicate _id values detected in mock form template data");
        return Promise.reject(new Error(`Duplicate _id values detected in mock form template data: ${uniqueDupes.join(", ")}`));
      }
      await FormTemplateModel.deleteMany({});
      const result = await FormTemplateModel.insertMany(mockData);
      logger.debug({ count: result.length }, "Form template mock data created");
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Seed department-formtemplate mappings
   * Maps all form templates to the "Orthopädie und Unfallchirurgie" department
   */
  async seedDepartmentMappings(allowInProduction: boolean = false): Promise<void> {
    try {
      if (env.NODE_ENV === "production" && !allowInProduction) {
        logger.error("Attempted to seed department mappings in production environment");
        throw new Error("Department mapping seeding is not available in production environment");
      }

      // Default department ID from userDepartmentRepository mock data
      const defaultDepartmentId = "675000000000000000000001"; // Orthopädie und Unfallchirurgie
      
      // Get all form template IDs from mock data
      const formTemplateIds = this._mockFormTemplateData
        .map(t => t._id)
        .filter((id): id is string => id !== undefined);

      // Check if mapping already exists
      const existingMapping = await DepartmentFormTemplateModel.findOne({ 
        departmentId: defaultDepartmentId 
      });

      if (existingMapping) {
        logger.info({ departmentId: defaultDepartmentId }, "Department mapping already exists, skipping");
        return;
      }

      // Create mapping with all form templates
      const mapping = await DepartmentFormTemplateModel.create({
        departmentId: defaultDepartmentId,
        formTemplateIds: formTemplateIds,
        createdBy: "675000000000000000000100", // admin user from mock data
        updatedBy: "675000000000000000000100",
      });

      logger.info({ 
        departmentId: defaultDepartmentId, 
        templatesCount: formTemplateIds.length 
      }, "Department-formtemplate mapping seeded successfully");
    } catch (error) {
      logger.error({ error }, "Error seeding department-formtemplate mappings");
      return Promise.reject(error);
    }
  }

  /**
   * Mock form template metadata for testing and development
   * Backend only stores metadata - form structure and scoring logic live in frontend plugins
   * 
   * NOTE: Frontend plugins MUST use matching IDs in their metadata.id field
   */
  private _mockFormTemplateData: FormTemplate[] = [
    {
      _id: "67b4e612d0feb4ad99ae2e83",
      title: "EFAS",
      description: "Evaluation of Functional Ability Scale",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e84",
      title: "AOFAS Forefoot",
      description: "American Orthopaedic Foot & Ankle Society - Hallux/Forefoot Score",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e85",
      title: "MOXFQ",
      description: "Manchester-Oxford Foot Questionnaire",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e86",
      title: "VAS",
      description: "Visual Analog Scale",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e87",
      title: "VISA-A",
      description: "Victorian Institute of Sport Assessment - Achilles",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e88",
      title: "AOFAS Hindfoot",
      description: "American Orthopaedic Foot & Ankle Society - Ankle-Hindfoot Score",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e89",
      title: "AOFAS Midfoot",
      description: "American Orthopaedic Foot & Ankle Society - Midfoot Score",
    },
    {
      _id: "67b4e612d0feb4ad99ae2e8a",
      title: "AOFAS Lesser Toes",
      description: "American Orthopaedic Foot & Ankle Society - Lesser Toes (MTP-IP) Score",
    },
  ];

  private getMockFormTemplateData(allowInProduction: boolean = false): FormTemplate[] {
    if (env.NODE_ENV === "production" && !allowInProduction) {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockFormTemplateData;
  }

  public get mockFormTemplateData() {
    return this.getMockFormTemplateData(false);
  }
}

export const formTemplateRepository = new FormTemplateRepository();
