import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed, isMockDataAccessAllowed } from "@/common/utils/seedingUtils";
import * as aofasJsonForm from "./JsonFormTemplates/AOFAS_JsonForm_Export.json";
import * as efasJsonForm from "./JsonFormTemplates/EFAS_JsonForm_Export.json";
import * as moxfqJsonForm from "./JsonFormTemplates/MOXFQ_JsonForm_Export.json";
import * as vasJsonForm from "./JsonFormTemplates/VAS_JsonForm_Export.json";
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

  async createMockDataFormTemplate(): Promise<void> {
    await assertSeedingAllowed();

    try {
      await FormTemplateModel.deleteMany({});
      const result = await FormTemplateModel.insertMany(this.mockFormTemplateData as any);
      logger.debug({ count: result.length }, "Form template mock data created");
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Include EFAS, AOFAS, MOXFQ, and VAS JSON templates
  private _mockFormTemplateData: any[] = [
    efasJsonForm as any,
    aofasJsonForm as any,
    moxfqJsonForm as any,
    vasJsonForm as any,
  ];

  public get mockFormTemplateData() {
    if (!isMockDataAccessAllowed()) {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockFormTemplateData;
  }
}

export const formTemplateRepository = new FormTemplateRepository();
