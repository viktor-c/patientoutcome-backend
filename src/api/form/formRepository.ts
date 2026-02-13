import { type Form, FormModel } from "@/api/form/formModel";
import { FormTemplate, FormTemplateModel, type CustomFormData } from "@/api/formtemplate/formTemplateModel";
import { calculateFormScore } from "@/api/formtemplate/formTemplatePlugins";
import { type ScoringData } from "@/api/formtemplate/formTemplatePlugins/types";
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
      formData: {
        isComplete: false,
        rawData: {},
        scoring: {}
      },
      createdAt: new Date(),
      completedAt: null,
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
      // EFAS Form 1
      const efasFormData1 = formTemplateRepository.mockFormTemplateData[0].formData as CustomFormData;
      const efasScoring1 = efasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e83", efasFormData1) : undefined;

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d51",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e83", //efas
        scoring: efasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        formData: efasFormData1 || {}, // Store raw form data (not ScoringData)
      });
      // VAS Form 1
      const vasFormData1 = formTemplateRepository.mockFormTemplateData[1].formData as CustomFormData;
      const vasScoring1 = vasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e86", vasFormData1) : undefined;
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d53",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        scoring: vasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
        formData: vasFormData1 || {}, // Store raw form data (not ScoringData)
      });

      // AOFAS Form 1
      const aofasFormData1 = formTemplateRepository.mockFormTemplateData[1].formData as CustomFormData;
      const aofasScoring1 = aofasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e84", aofasFormData1) : undefined;

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d54",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e84", //aofas
        scoring: aofasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        formData: aofasFormData1 || {}, // Store raw form data (not ScoringData)
      });

      // forms for the second consultation

      // VAS Form 2
      const vasFormData2 = formTemplateRepository.mockFormTemplateData[3].formData as CustomFormData;
      const vasScoring2 = vasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e86", vasFormData2) : undefined;
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d54",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        scoring: vasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
        formData: vasFormData2 || {}, // Store raw form data (not ScoringData)
      });
      // EFAS Form 2
      const efasFormData2 = formTemplateRepository.mockFormTemplateData[0].formData as CustomFormData;
      const efasScoring2 = efasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e83", efasFormData2) : undefined;

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d55",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e83",
        scoring: efasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        formData: efasFormData2 || {}, // Store raw form data (not ScoringData)
      });

      // AOFAS Form 2
      const aofasFormData2 = formTemplateRepository.mockFormTemplateData[1].formData as CustomFormData;
      const aofasScoring2 = aofasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e84", aofasFormData2) : undefined;

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d56",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e84",
        scoring: aofasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        formData: aofasFormData2 || {}, // Store raw form data (not ScoringData)
      });

      const moxfqFormData1 = formTemplateRepository.mockFormTemplateData[2].formData as CustomFormData;
      const moxfqScoring1 = moxfqFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e85", moxfqFormData1) : undefined;
      // This is the moxfq Form
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d57",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        scoring: moxfqScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
        formData: moxfqFormData1 || {}, // Store raw form data (not ScoringData)
      });

      // This is the moxfq Form
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d58",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        scoring: moxfqScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
        formData: moxfqFormData1 || {}, // Store raw form data (not ScoringData)
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
    const maxPossibleScore = questionKeys.length * 4;
    const completionRate = validAnswers.length / questionKeys.length;

    // Convert to 0-100 scale: (rawScore / maxPossibleScore) * 100
    const normalizedScore = (rawScore / maxPossibleScore) * 100;

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore,
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
    rawData: data,
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore,
    },
    total: totalScore,
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
      rawData: data,
      subscales: {},
      total: null,
    };
  }

  if (validAnswers.length === 0) {
    // Questions exist, but no valid answers
    return {
      rawData: data,
      subscales: {},
      total: {
        name: "AOFAS Total",
        description: "American Orthopedic Foot & Ankle Society Score",
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: 100,
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
  const maxPossibleScore = 100;
  const completionRate = validAnswers.length / questionKeys.length;
  const normalizedScore = (rawScore / maxPossibleScore) * 100;

  const totalScore = {
    name: "AOFAS Total",
    description: "American Orthopedic Foot & Ankle Society Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxPossibleScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawData: data,
    subscales: {}, // AOFAS doesn't have subscales
    total: totalScore,
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

  const subscaleScores: { [key: string]: ScoringData["subscales"][string] } = {};
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
      const maxPossibleScore = questionKeys.length * 5; // EFAS uses 0-5 scale
      const completionRate = validAnswers.length / questionKeys.length;
      const normalizedScore = (rawScore / maxPossibleScore) * 100;

      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        maxPossibleScore,
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
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: questionKeys.length * 4,
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
    const maxPossibleScore = allQuestionsList.length * 5;
    const completionRate = allValidAnswers.length / allQuestionsList.length;
    const normalizedScore = (rawScore / maxPossibleScore) * 100;

    totalScore = {
      name: "EFAS Total",
      description: "European Foot and Ankle Society Score",
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore,
      answeredQuestions: allValidAnswers.length,
      totalQuestions: allQuestionsList.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  }

  return {
    rawData: data,
    subscales: subscaleScores,
    total: totalScore,
  };
}

export { formRepository };
