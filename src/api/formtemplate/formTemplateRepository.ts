import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import * as aofasJsonForm from "./JsonFormTemplates/AOFAS_JsonForm_Export.json";
import * as efasJsonForm from "./JsonFormTemplates/EFAS_JsonForm_Export.json";
import * as moxfqJsonForm from "./JsonFormTemplates/MOXFQ_JsonForm_Export.json";
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
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

    try {
      await FormTemplateModel.deleteMany({});
      const result = await FormTemplateModel.insertMany(this.mockFormTemplateData as any);
      logger.debug({ count: result.length }, "Form template mock data created");
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Include EFAS and AOFAS JSON templates as-is
  private _mockFormTemplateData: any[] = [efasJsonForm as any, aofasJsonForm as any];

  /**
   * Converts the MOXFQ JSON format to FormTemplate format (kept as before)
   */
  private convertMoxfqJsonToFormTemplate(): FormTemplate {
    const moxfq = moxfqJsonForm as any;

    const createEnumNames = (questionKey: string): string[] => {
      const deTrans = moxfq.translations?.de ?? {};
      const enTrans = moxfq.translations?.en ?? {};
      return [0, 1, 2, 3, 4].map(
        (value) => deTrans[`moxfq.${questionKey}.${value}`] ?? enTrans[`moxfq.${questionKey}.${value}`] ?? undefined,
      );
    };

    const enhancedSchema = JSON.parse(JSON.stringify(moxfq.schema));

    if (enhancedSchema?.properties?.moxfq?.properties) {
      Object.keys(enhancedSchema.properties.moxfq.properties).forEach((questionKey) => {
        const question = enhancedSchema.properties.moxfq.properties[questionKey];

        const germanTitle =
          moxfq.translations?.de?.[`moxfq.${questionKey}.label`] ??
          moxfq.translations?.en?.[`moxfq.${questionKey}.label`] ??
          question.title;
        if (germanTitle) {
          question.title = germanTitle;
        }

        const enumNames = createEnumNames(questionKey);
        if (enumNames && enumNames.length > 0 && enumNames.every((name) => name !== undefined)) {
          question.enumNames = enumNames as any;
        }
      });

      enhancedSchema.properties.moxfq.title =
        moxfq.translations?.de?.["moxfq.title.label"] ??
        moxfq.translations?.en?.["moxfq.title.label"] ??
        moxfq.formTitle;
    }

    return {
      _id: "67b4e612d0feb4ad99ae2e85",
      title: moxfq.formTitle,
      description: moxfq.description,
      markdownHeader: `# ${moxfq.translations?.de?.["moxfq.title.label"] ?? moxfq.formTitle}\n\n## Einleitung\nAuf der folgenden Seite finden Sie 16 Fragen zu Ihren Problemen am Fuß und/oder Sprunggelenk.\n\nBitte beantworten Sie alle Fragen so, dass Sie Ihre Situation **innerhalb der letzten 4 Wochen** am passendsten beschreiben. \n\nJede Frage hat 5 Antwortmöglichkeiten.`,
      markdownFooter:
        "## Sie haben den MOXFQ Fragebogen ausgefüllt\n\n**Vielen Dank für Ihre Teilnahme!**\n\nIhre Antworten helfen uns dabei, Ihre Beschwerden besser zu verstehen und die bestmögliche Behandlung für Sie zu planen.",
      formSchema: enhancedSchema,
      formSchemaUI: moxfq.uischema,
      formData: moxfq.data,
      translations: moxfq.translations,
    } as FormTemplate;
  }

  public get mockFormTemplateData() {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return [...this._mockFormTemplateData, this.convertMoxfqJsonToFormTemplate()];
  }
}

export const formTemplateRepository = new FormTemplateRepository();
