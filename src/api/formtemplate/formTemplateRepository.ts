import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { type FormTemplate, FormTemplateModel } from "./formTemplateModel";

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
