import type { Code } from "@/api/code/codeModel";
import { codeRepository } from "@/api/code/codeRepository";
import type { Form } from "@/api/form/formModel";
import { formRepository } from "@/api/form/formRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { Consultation, CreateConsultation } from "./consultationModel";
import { ConsultationRepository } from "./consultationRepository";

export class ConsultationService {
  private consultationRepository: ConsultationRepository;
  private codeRepository: typeof codeRepository;
  /**
   * Constructor for the ConsultationService class.
   * Initializes the consultationRepository and codeRepository.
   * @param {ConsultationRepository} consultationRepository - The repository for managing consultations.
   * @param {typeof codeRepository} codeRepository - The repository for managing codes.
   */
  constructor() {
    this.consultationRepository = new ConsultationRepository();
    this.codeRepository = codeRepository;
  }

  async createConsultation(
    patientId: string,
    caseId: string,
    data: CreateConsultation,
  ): Promise<ServiceResponse<Consultation | null>> {
    try {
      const newConsultation = await this.consultationRepository.createConsultation(patientId, caseId, data);
      if (!newConsultation) {
        return ServiceResponse.failure("Failed to create consultation", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      //after creating the consultation, we can check if the code is valid
      if (data.formAccessCode) {
        const code = await this.codeRepository.findByInternalCode(data.formAccessCode.toString());

        if (!code) {
          return ServiceResponse.failure("Code not found", null, StatusCodes.BAD_REQUEST);
        }
        if (code.activatedOn) {
          return ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT);
        }
        //@ts-expect-error
        const activatedCode = await this.codeRepository.activateCode(code.id, newConsultation._id.toString());
        if (typeof activatedCode === "string") {
          return ServiceResponse.failure(activatedCode, null, StatusCodes.BAD_REQUEST);
        }
      }

      //** process form creation based on given form templates */
      if (data.formTemplates && data.formTemplates.length > 0) {
        // based on the array of id in formTemplates, create a new form for each template
        // use the form API to create a new form
        // if there are multiple templates, create a new form for each template
        for (let i = 0; i < data.formTemplates.length; i++) {
          const formId = await formRepository.createFormByTemplateId(
            patientId,
            caseId,
            newConsultation.id,
            data.formTemplates[i],
          );
          newConsultation.proms.push(formId);
        }
      }
      //BGU why do we need to save the consultation again? Why this error?
      await newConsultation.save();

      return ServiceResponse.created("Consultation created successfully", newConsultation);
    } catch (ex) {
      const errorMessage = `Error creating consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);

      return ServiceResponse.failure(
        "An error occurred while creating consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationById(consultationId: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const consultation = await this.consultationRepository.getConsultationById(consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Consultation found", consultation);
    } catch (ex) {
      const errorMessage = `Error fetching consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async updateConsultation(
    patientId: string,
    consultationId: string,
    data: Partial<Consultation>,
  ): Promise<ServiceResponse<Consultation | null>> {
    try {
      const originalConsultation = await this.consultationRepository.getConsultationById(consultationId);
      let updatedConsultation = null;
      if (!originalConsultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      /**
       * process form access code
       */
      if (!data.formAccessCode && originalConsultation.formAccessCode) {
        await this.codeRepository.deactivateCode(originalConsultation.formAccessCode.toString());
      } else if (data.formAccessCode && originalConsultation.formAccessCode?.toString() !== data.formAccessCode) {
        // If a new formAccessCode is provided, check if it exists and is not already activated
        const code = await this.codeRepository.findByInternalCode(data.formAccessCode.toString());
        if (!code) {
          return ServiceResponse.failure("Code not found", null, StatusCodes.BAD_REQUEST);
        }
        if (code.activatedOn) {
          return ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT);
        }
        await this.codeRepository.activateCode(code.id, consultationId);
      }

      /**
       * Process form templates
       * check if formTemplates are provided
       * check if originalconsultation has formTemplates
       * only add new form templates if they are not already present.
       */
      if (data.proms && data.proms.length > 0) {
        // initialise proms in the original data if not present
        if (!originalConsultation.proms) {
          originalConsultation.proms = [];
        }

        //first intersect the originalConsultation.proms.formTemplateId with the ids from data.proms
        // @ts-expect-error originalConsultation.proms will be populated with the forms and not the ids
        const remainingFormsById = originalConsultation.proms
          .filter((template: Form) =>
            // @ts-expect-error data.proms already checked if empty
            data.proms.includes(template.formTemplateId.toString()),
          )
          .map((template: Form) => template._id.toString());

        const excludedFormsById = originalConsultation.proms
          .filter((template) => !data.proms.includes(template.formTemplateId.toString()))
          .map((template) => template._id);
        // delete the excluded forms from the database, but only consultation was successfully updated

        // then filter the data.proms to get the new templates that are not in the originalConsultation.proms
        // @ts-expect-error data.proms will be populated with the forms and not the ids
        const newPromsByTemplateId = data.proms.filter(
          (templateId: string) =>
            !originalConsultation.proms.some((template: Form) => template.formTemplateId.toString() === templateId),
        );
        const newPromsById: string[] = [...remainingFormsById];
        // for each newProms create a new form by template id
        for (const templateId of newPromsByTemplateId) {
          const formId = await formRepository.createFormByTemplateId(
            patientId,
            originalConsultation.patientCaseId.toString(),
            consultationId,
            templateId.toString(),
          );
          newPromsById.push(formId.toString());
        }
        // now we have the newPromsById which contains the ids of the new forms and the existing forms
        // we can now save the new forms to the future consultation, which is data.
        data.proms = newPromsById;
        // we have to try to update the consultation with the new data
        // because first deleting forms, then updating the consultation can lead to an error
        // and the deleted forms will not be recoverable
        updatedConsultation = await this.consultationRepository.updateConsultation(consultationId, data);
        if (!updatedConsultation) {
          return ServiceResponse.failure("Failed to update consultation", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
        try {
          // if there are excluded forms, delete them from the database
          if (excludedFormsById.length > 0) {
            const deletePromises = excludedFormsById.map((formId) => formRepository.deleteForm(formId.toString()));
            await Promise.all(deletePromises);
          }
        } catch (ex) {
          const errorMessage = `Error deleting excluded forms: ${(ex as Error).message}`;
          logger.error(errorMessage);
          return ServiceResponse.failure(
            "An error occurred while deleting excluded forms.",
            null,
            StatusCodes.INTERNAL_SERVER_ERROR,
          );
        }
      }

      /**
       * If data.proms is empty, it means that the user wants to remove all forms from the consultation.
       */
      if (
        data.proms &&
        data.proms.length === 0 &&
        originalConsultation.proms &&
        originalConsultation.proms.length > 0
      ) {
        // if data.proms is empty, it means that the user wants to remove all forms from the consultation
        // so we need to delete all forms from the consultation
        const excludedFormsById = originalConsultation.proms.map((form: Form) => form._id);
        // delete the excluded forms from the database, but only consultation was successfully updated
        const deletePromises = excludedFormsById.map((formId) => formRepository.deleteForm(formId.toString()));
        await Promise.all(deletePromises);
        // data.proms already empty, so we can just update the consultation
      }

      /**
       * update consultation with the new data;
       */
      try {
        // if updateConsultation is still null, it means that the consultation was not updated
        // if we already updated once, don't update again
        if (!updatedConsultation) {
          updatedConsultation = await this.consultationRepository.updateConsultation(consultationId, data);
        }
      } catch (error) {
        return ServiceResponse.failure("Failed to update consultation", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      // if updatedConsultation was successfully updated, delete excluded forms from forms table
      return ServiceResponse.success("Consultation updated successfully", updatedConsultation);
    } catch (ex) {
      const errorMessage = `Error updating consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteConsultation(consultationId: string): Promise<ServiceResponse<null>> {
    try {
      const deleted = await this.consultationRepository.deleteConsultation(consultationId);
      if (!deleted) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Consultation deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while deleting consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllConsultations(patientId: string, caseId: string): Promise<ServiceResponse<Consultation[]>> {
    try {
      // TODO do we need checking for patientId
      const consultations = await this.consultationRepository.getAllConsultations(caseId);
      return ServiceResponse.success("Consultations retrieved successfully", consultations);
    } catch (ex) {
      const errorMessage = `Error fetching consultations: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultations.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationByExternalCode(externalCode: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const code = await this.codeRepository.findByExternalCode(externalCode);
      if (!code) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }

      if (!code.consultationId) {
        return ServiceResponse.failure("Code is not associated with any consultation", null, StatusCodes.BAD_REQUEST);
      }

      const consultation = await this.consultationRepository.getConsultationById(code.consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Consultation retrieved successfully", consultation);
    } catch (ex) {
      const errorMessage = `Error fetching consultation by code: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  compareConsultations(consultation1: Consultation, consultation2: Consultation): boolean {
    return JSON.stringify(consultation1) === JSON.stringify(consultation2);
  }
}

export const consultationService = new ConsultationService();
