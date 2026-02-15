import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { type FormTemplate, FormTemplateModel } from "./formTemplateModel";
import { allFormPlugins } from "./formTemplatePlugins";

export class FormTemplateRepository {
  async getAllTemplates(): Promise<FormTemplate[]> {
    return FormTemplateModel.find().select("-__v").lean();
  }

  async getTemplateById(templateId: string): Promise<FormTemplate | null> {
    return FormTemplateModel.findById(templateId).select("-__v").lean();
  }

  async createTemplate(templateData: FormTemplate): Promise<FormTemplate> {
    const formTemplate = new FormTemplateModel(templateData);
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

  // Include form templates from plugins - extract only metadata
  private _mockFormTemplateData: FormTemplate[] = allFormPlugins.map((plugin) => {
    const template = plugin.formTemplate as any;
    return {
      _id: template._id,
      title: template.title,
      description: template.description,
    } as FormTemplate;
  });

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
