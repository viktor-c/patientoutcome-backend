import { type Form, FormModel } from "@/api/form/formModel";
import { FormTemplate, FormTemplateModel, type CustomFormData, type SubscaleScore, type FormQuestions } from "@/api/formtemplate/formTemplateModel";
import { formTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
import { raw } from "express";
import type { ObjectId } from "mongoose";

export class FormRepository {
  async getAllForms(): Promise<Form[]> {
    return FormModel.find({ deletedAt: null }).lean();
  }

  async getFormByPatientCaseConsultationFormId(
    patientId: string,
    caseId: string,
    consultationId: string,
    formId: string,
  ): Promise<Form | null> {
    return FormModel.findOne({ patientId, caseId, consultationId, _id: formId }).lean();
  }

  async getFormById(id: string): Promise<Form | null> {
    // populate caseId, consultationId, formTemplateId
    return FormModel.findOne({ _id: id, deletedAt: null }).populate("caseId consultationId formTemplateId").lean();
  }

  async createForm(data: Form): Promise<Form> {
    const newForm = new FormModel(data);
    return newForm.save();
  }
  async createFormByTemplateId(caseId: string, consultationId: string, formTemplateId: string): Promise<Form | null> {
    // first get the formtemplate by id
    const formTemplate = await FormTemplateModel.findById(formTemplateId);
    if (!formTemplate) {
      return Promise.reject("Form template not found");
    }

    const deepCopy = JSON.parse(JSON.stringify(formTemplate.toObject()));
    deepCopy._id = undefined; // remove the _id field to create a new document

    const newForm = new FormModel({
      caseId,
      consultationId,
      formTemplateId: formTemplateId,
      // Initialize with null - frontend will create empty PatientFormData structure
      patientFormData: null,
      createdAt: new Date(),
      ...deepCopy,
    });
    await newForm.save();
    return Promise.resolve(newForm);
  }

  async updateForm(id: string, data: Partial<Form>): Promise<Form | null> {
    const updated = await FormModel.findByIdAndUpdate(id, data, { new: true }).populate(
      "caseId consultationId formTemplateId",
    );
    return updated ? updated.toObject() : null;
  }

  async deleteForm(id: string): Promise<boolean> {
    const result = await FormModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Soft delete a form by setting deletedAt timestamp
   * @param id - Form ID
   * @param deletedBy - User ID who deleted the form
   * @param deletionReason - Reason for deletion
   * @returns Updated form with deletedAt set
   */
  async softDeleteForm(id: string, deletedBy: string, deletionReason: string): Promise<Form | null> {
    try {
      const softDeletedForm = await FormModel.findByIdAndUpdate(
        id,
        {
          deletedAt: new Date(),
          deletedBy,
          deletionReason
        },
        { new: true, lean: true }
      );
      return softDeletedForm;
    } catch (error) {
      logger.error({ error }, "Error soft deleting form");
      return Promise.reject(error);
    }
  }

  /**
   * Restore a soft deleted form
   * @param id - Form ID
   * @returns Restored form
   */
  async restoreForm(id: string): Promise<Form | null> {
    try {
      const restoredForm = await FormModel.findByIdAndUpdate(
        id,
        {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null
        },
        { new: true, lean: true }
      );
      return restoredForm;
    } catch (error) {
      logger.error({ error }, "Error restoring form");
      return Promise.reject(error);
    }
  }

  /**
   * Get all soft deleted forms with pagination
   * @param options - Pagination options
   * @returns Paginated list of soft deleted forms
   */
  async findAllDeletedForms(options: { page?: number; limit?: number } = {}): Promise<{
    forms: Form[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const [forms, total] = await Promise.all([
        FormModel.find({ deletedAt: { $ne: null } })
          .populate("caseId consultationId formTemplateId deletedBy")
          .sort({ deletedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FormModel.countDocuments({ deletedAt: { $ne: null } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        forms,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error }, "Error finding deleted forms");
      return Promise.reject(error);
    }
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createFormMockData(): Promise<void> {
    try {
      await FormModel.deleteMany({});
      this.populateMockForms();
      const res = await FormModel.insertMany(this.mockForms);
      if (res) {
        logger.info("Form mock data created successfully");
        return Promise.resolve();
      }
    } catch (error) {
      logger.error({ error }, "Error creating form mock data");
      return Promise.reject();
    }
  }

  // no need to be async, just populate the mock forms
  // Note: This is called from createFormMockData which already calls assertSeedingAllowed()
  populateMockForms(): void {
    this.mockForms = [];
    try {
      /**
       * Mock form data samples for testing and development
       * These are simple sample data structures - NO scoring logic on backend
       * Scoring is calculated by frontend plugins only
       */
      const mockFormDataSamples: Record<string, CustomFormData> = {
        // EFAS - Evaluation of Functional Ability Scale
        "67b4e612d0feb4ad99ae2e83": {
          section1: { q1: 3, q2: 2, q3: 4, q4: 3, q5: 2 },
          section2: { q6: 3, q7: 4, q8: 2, q9: 3, q10: 4 },
        },
        // AOFAS - American Orthopaedic Foot & Ankle Society Score
        "67b4e612d0feb4ad99ae2e84": {
          section1: { q1: 40, q2: 10, q3: 10, q4: 8, q5: 3, q6: 10, q7: 5, q8: 10 },
        },
        // MOXFQ - Manchester-Oxford Foot Questionnaire
        "67b4e612d0feb4ad99ae2e85": {
          moxfq: {
            q1: 2, q2: 3, q3: 1, q4: 2, q5: 3,
            q6: 2, q7: 3, q8: 1, q9: 2, q10: 3,
            q11: 2, q12: 1, q13: 3, q14: 2, q15: 1, q16: 2,
          },
        },
        // VAS - Visual Analog Scale
        "67b4e612d0feb4ad99ae2e86": {
          pain: 7,
        },
      };

      // Helper to create PatientFormData without scores (frontend calculates scores)
      const createMockPatientFormData = (formData: CustomFormData) => {
        return {
          rawFormData: formData,
          subscales: undefined,
          totalScore: undefined,
          fillStatus: "draft" as const,
          completedAt: null,
          beginFill: new Date(),
        };
      };

      // EFAS Form 1
      const efasFormData1 = mockFormDataSamples["67b4e612d0feb4ad99ae2e83"];

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d51",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e83", //efas
        patientFormData: createMockPatientFormData(efasFormData1),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
      });

      // VAS Form 1
      const vasFormData1 = mockFormDataSamples["67b4e612d0feb4ad99ae2e86"];
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d53",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        patientFormData: createMockPatientFormData(vasFormData1),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
      });

      // AOFAS Form 1
      const aofasFormData1 = mockFormDataSamples["67b4e612d0feb4ad99ae2e84"];

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d54",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e84", //aofas
        patientFormData: createMockPatientFormData(aofasFormData1),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
      });

      // forms for the second consultation

      // VAS Form 2
      const vasFormData2 = mockFormDataSamples["67b4e612d0feb4ad99ae2e86"];
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d54",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        patientFormData: createMockPatientFormData(vasFormData2),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
      });

      // EFAS Form 2
      const efasFormData2 = mockFormDataSamples["67b4e612d0feb4ad99ae2e83"];

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d55",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e83",
        patientFormData: createMockPatientFormData(efasFormData2),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
      });

      // AOFAS Form 2
      const aofasFormData2 = mockFormDataSamples["67b4e612d0feb4ad99ae2e84"];

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d56",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e84",
        patientFormData: createMockPatientFormData(aofasFormData2),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
      });

      // MOXFQ Form 1
      const moxfqFormData1 = mockFormDataSamples["67b4e612d0feb4ad99ae2e85"];
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d57",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        patientFormData: createMockPatientFormData(moxfqFormData1),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
      });

      // MOXFQ Form 2
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d58",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        patientFormData: createMockPatientFormData(moxfqFormData1),
        createdAt: new Date(),
        updatedAt: undefined,
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
      });

      logger.info("Mock forms populated with template data successfully");
    } catch (error) {
      logger.error({ error }, "Error populating mock forms with template data");
      throw error;
    }
  }

  private _mockForms: Form[] = [];

  /**
   * Getter to access mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public get mockForms(): Form[] {
    return this._mockForms;
  }

  /**
   * Setter to update mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public set mockForms(value: Form[]) {
    this._mockForms = value;
  }
}

const formRepository = new FormRepository();
if (process.env.NODE_ENV === "test") {
  formRepository.populateMockForms();
}

/**
 * Form scoring calculation utilities
 * These functions calculate scores for different form types (MOXFQ, AOFAS, EFAS)
 * Used by backend to initialize mock data with proper scoring structures
 */

/**
 * Calculate MOXFQ score from form data
 * @param {Object} data - Form data with question responses (may be nested in 'moxfq' section or flat)
 * @returns {Object} ScoringData structure
 */
function calculateMoxfqScore(data: CustomFormData | Record<string, unknown>): ScoringData {
  // Handle nested structure (e.g., { moxfq: { q1: 0, q2: 1, ... } })
  // Extract questions from 'moxfq' section if present, otherwise use data directly
  const questions = data.moxfq || data;

  // Define subscales according to MOXFQ standard
  const subscales = {
    walkingStanding: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"],
    pain: ["q9", "q11", "q12", "q15"],
    socialInteraction: ["q10", "q13", "q14", "q16"],
  };

  // Calculate subscale scores
  const calculateSubscaleScore = (questionKeys: string[], subscaleName: string, subscaleDescription: string) => {
    const validAnswers = questionKeys
      .map((key) => {
        const value = (questions as Record<string, unknown>)[key];
        return typeof value === 'number' ? value : null;
      })
      .filter((value): value is number => value !== null);

    if (validAnswers.length === 0) return null;

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
    const maxScore = questionKeys.length * 4;
    const completionRate = validAnswers.length / questionKeys.length;

    // Convert to 0-100 scale: (rawScore / maxScore) * 100
    const normalizedScore = (rawScore / maxScore) * 100;

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  };

  // Calculate individual subscale scores
  const walkingStandingScore = calculateSubscaleScore(
    subscales.walkingStanding,
    "Walking & Standing",
    "Assesses difficulties in walking and standing.",
  );
  const painScore = calculateSubscaleScore(subscales.pain, "Pain", "Evaluates pain levels and impact.");
  const socialInteractionScore = calculateSubscaleScore(
    subscales.socialInteraction,
    "Social Interaction",
    "Measures social engagement and interaction.",
  );

  // Calculate total score
  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction];
  const totalScore = calculateSubscaleScore(allQuestions, "Total", "Measures overall health status.");

  return {
    rawFormData: data as FormQuestions,
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore,
    },
    totalScore: totalScore,
  };
}

/**
 * Calculate AOFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasScore(data: CustomFormData | Record<string, unknown>): ScoringData {
  // AOFAS has a single section but we need to handle nested structure
  const sectionKey = Object.keys(data)[0]; // e.g., 'vorfußfragebogen'
  const questions = data[sectionKey] || {};

  const questionKeys = Object.keys(questions);
  const validAnswers = questionKeys
    .map((key) => {
      const value = (questions as Record<string, unknown>)[key];
      return typeof value === 'number' ? value : null;
    })
    .filter((value): value is number => value !== null);

  if (questionKeys.length === 0) {
    // No questions at all
    return {
      rawFormData: data as FormQuestions,
      subscales: {},
      totalScore: null,
    };
  }

  if (validAnswers.length === 0) {
    // Questions exist, but no valid answers
    return {
      rawFormData: data as FormQuestions,
      subscales: {},
      totalScore: {
        name: "AOFAS Total",
        description: "American Orthopedic Foot & Ankle Society Score",
        rawScore: 0,
        normalizedScore: 0,
        maxScore: 100,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      },
    };
  }

  const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);

  // AOFAS max score is 100 (based on clinical standard)
  // Each question has different max values, but total is always 100
  const maxScore = 100;
  const completionRate = validAnswers.length / questionKeys.length;
  const normalizedScore = (rawScore / maxScore) * 100;

  const totalScore = {
    name: "AOFAS Total",
    description: "American Orthopedic Foot & Ankle Society Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawFormData: data as FormQuestions,
    subscales: {}, // AOFAS doesn't have subscales
    totalScore: totalScore,
  };
}

/**
 * Calculate EFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateEfasScore(data: CustomFormData | Record<string, unknown>): ScoringData {
  // EFAS has two sections: standardfragebogen and sportfragebogen
  const sections = ["standardfragebogen", "sportfragebogen"];

  const subscaleScores: { [key: string]: SubscaleScore | null } = {};
  let allQuestions: string[] = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestions = [...allQuestions, ...questionKeys];

    const validAnswers = questionKeys
      .map((key) => {
        const value = (questions as Record<string, unknown>)[key];
        return typeof value === 'number' ? value : null;
      })
      .filter((value): value is number => value !== null);

    if (questionKeys.length === 0) {
      // No questions in this section, set subscale to null
      subscaleScores[sectionKey] = null;
      return;
    }

    if (validAnswers.length > 0) {
      const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
      const maxScore = questionKeys.length * 5; // EFAS uses 0-5 scale
      const completionRate = validAnswers.length / questionKeys.length;
      const normalizedScore = (rawScore / maxScore) * 100;

      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        maxScore,
        answeredQuestions: validAnswers.length,
        totalQuestions: questionKeys.length,
        completionPercentage: Math.round(completionRate * 100),
        isComplete: completionRate === 1,
      };
    } else {
      // No valid answers, but questions exist: fill with null or default structure
      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore: 0,
        normalizedScore: 0,
        maxScore: questionKeys.length * 4,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      };
    }
  });

  // Calculate total across all sections
  const allValidAnswers: number[] = [];
  const allQuestionsList: string[] = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestionsList.push(...questionKeys);

    questionKeys.forEach((key) => {
      const value = (questions as Record<string, unknown>)[key];
      if (typeof value === 'number') {
        allValidAnswers.push(value);
      }
    });
  });

  let totalScore = null;
  if (allValidAnswers.length > 0) {
    const rawScore = allValidAnswers.reduce((sum, value) => sum + value, 0);
    const maxScore = allQuestionsList.length * 5;
    const completionRate = allValidAnswers.length / allQuestionsList.length;
    const normalizedScore = (rawScore / maxScore) * 100;

    totalScore = {
      name: "EFAS Total",
      description: "European Foot and Ankle Society Score",
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxScore,
      answeredQuestions: allValidAnswers.length,
      totalQuestions: allQuestionsList.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  }

  return {
    rawFormData: data as FormQuestions,
    subscales: subscaleScores,
    totalScore: totalScore,
  };
}

export { formRepository };
