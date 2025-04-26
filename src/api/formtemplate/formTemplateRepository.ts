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

  async updateTemplate(templateId: string, templateData: Partial<FormTemplate>): Promise<FormTemplate | null> {
    return FormTemplateModel.findByIdAndUpdate(templateId, templateData, { new: true }).select("-__v").lean();
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = await FormTemplateModel.findByIdAndDelete(templateId).lean();
    return !!result;
  }

  async createMockData(): Promise<void> {
    try {
      await FormTemplateModel.deleteMany({});
      const result = await FormTemplateModel.insertMany(this.mockFormTemplateData);
      console.debug("Mock data created:", result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Mock data for formTemplate
  public mockFormTemplateData = [
    {
      _id: "67b4e612d0feb4ad99ae2e7f",
      title: "Health Survey",
      description: "A survey to collect health data",
      formData: { name: "John Doe", age: 30 },
      formSchema: { type: "object", properties: { name: { type: "string" }, age: { type: "number" } } },
      formUISchema: { name: { "ui:widget": "text" }, age: { "ui:widget": "updown" } },
    },
    {
      _id: "67b4e612d0feb4ad99ae2e80",
      title: "Feedback Form",
      description: "A form to collect user feedback",
      formData: { feedback: "Great service!" },
      formSchema: { type: "object", properties: { feedback: { type: "string" } } },
      formUISchema: { feedback: { "ui:widget": "textarea" } },
    },
    {
      _id: "67b4e612d0feb4ad99ae2e81",
      title: "Employee Satisfaction Survey",
      description: "A survey to measure employee satisfaction",
      formData: { satisfaction: 5, comments: "Very satisfied" },
      formSchema: { type: "object", properties: { satisfaction: { type: "number" }, comments: { type: "string" } } },
      formUISchema: { satisfaction: { "ui:widget": "range" }, comments: { "ui:widget": "textarea" } },
    },
    {
      _id: "67b4e612d0feb4ad99ae2e82",
      title: "Event Registration Form",
      description: "A form to register for an event",
      formData: { name: "Jane Doe", email: "jane.doe@example.com" },
      formSchema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } },
      formUISchema: { name: { "ui:widget": "text" }, email: { "ui:widget": "email" } },
    },
  ];
}

export const formTemplateRepository = new FormTemplateRepository();
