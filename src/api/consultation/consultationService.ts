import type { Code } from "@/api/code/codeModel";
import { codeRepository } from "@/api/code/codeRepository";
import type { Form } from "@/api/form/formModel";
import { formRepository } from "@/api/form/formRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";
import type { Consultation, CreateConsultation, UpdateConsultation } from "./consultationModel";
import { type ConsultationRepository, consultationRepository } from "./consultationRepository";

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
    // this.consultationRepository = new ConsultationRepository();
    this.consultationRepository = consultationRepository;
    this.codeRepository = codeRepository;
  }

  /**
   *
   * @param caseId
   * @param data
   * @returns
   */
  async createConsultation(caseId: string, data: CreateConsultation): Promise<ServiceResponse<Consultation | null>> {
    try {
      // Step 1: Create consultation with empty proms array to satisfy validation
      const consultationData = {
        ...data,
        proms: [], // Initialize with empty array
      };

      const newConsultation = await this.consultationRepository.createConsultation(caseId, consultationData);
      if (!newConsultation) {
        return ServiceResponse.failure("Failed to create consultation", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Ensure newConsultation._id exists for subsequent operations
      if (!newConsultation._id) {
        return ServiceResponse.failure("Failed to get consultation ID", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      //after creating the consultation, we can check if the code is valid
      if (data.formAccessCode) {
        // Find code by the code ID (not by code string)
        const code = await this.codeRepository.findById(data.formAccessCode.toString());
        if (!code) {
          return ServiceResponse.failure("Code not found", null, StatusCodes.BAD_REQUEST);
        }
        if (code.activatedOn) {
          return ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT);
        }
        // Pass the code string to activateCode
        const activatedCode = await this.codeRepository.activateCode(code.code, newConsultation._id.toString());
        if (typeof activatedCode === "string") {
          return ServiceResponse.failure(activatedCode, null, StatusCodes.BAD_REQUEST);
        }
      }

      // Step 2: Process form creation based on given form templates now that we have consultation ID
      if (data.formTemplates && data.formTemplates.length > 0) {
        const createdFormIds: string[] = [];

        // Create a form for each template
        for (let i = 0; i < data.formTemplates.length; i++) {
          let formTemplateId = "";
          if (typeof data.formTemplates[i] === "string") {
            formTemplateId = data.formTemplates[i] as string;
          } else if (isValidObjectId(data.formTemplates[i])) {
            formTemplateId = data.formTemplates[i].toString();
          }

          const newCreatedForm = await formRepository.createFormByTemplateId(
            caseId,
            newConsultation._id.toString(),
            formTemplateId,
          );
          if (newCreatedForm?._id) {
            createdFormIds.push(newCreatedForm._id.toString());
          }
        }

        // Update the consultation with the created form IDs
        if (createdFormIds.length > 0) {
          const updatedConsultation = await this.consultationRepository.updateConsultation(
            newConsultation._id.toString(),
            { proms: createdFormIds },
          );
          if (updatedConsultation) {
            return ServiceResponse.created("Consultation created successfully", updatedConsultation);
          }
        }
      }

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

  /**
   *
   * @param consultationId - The ID of the consultation to retrieve.
   * @throws {ServiceResponse} if an error occurs while fetching the consultation.
   * @description This method retrieves a consultation by its ID.
   * It checks if the consultation exists in the repository, and if it does, it returns the consultation.
   * If the consultation is not found, it returns a failure response.
   * If an error occurs during the retrieval process, it logs the error and returns a failure response.
   * @returns
   */
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

  /**
   *
   * @param patientId - The ID of the patient.
   * @param consultationId - The ID of the consultation to update.
   * @param data - The data to update the consultation with.
   * @returns a ServiceResponse containing the updated consultation or an error message.
   * @throws {ServiceResponse} if an error occurs while updating the consultation.
   * @description This method updates a consultation by its ID and patient ID.
   * It processes form access codes and form templates, updating them as necessary.
   */
  async updateConsultation(
    consultationId: string,
    data: UpdateConsultation,
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
        //BUG if we deactivate the code on first update, then saving a consultation twice would not work;
        // so do not deactivate the code for now, maybe move this to another API call
        // second call throws an error, so use try catch
        // await this.codeRepository.deactivateCode(originalConsultation.formAccessCode.toString());
      } else if (data.formAccessCode && originalConsultation.formAccessCode?.toString() !== data.formAccessCode) {
        // If a new formAccessCode is provided, check if it exists and is not already activated
        const code = await this.codeRepository.findById(data.formAccessCode.toString());
        if (!code) {
          return ServiceResponse.failure("Code not found", null, StatusCodes.BAD_REQUEST);
        }
        if (code.activatedOn) {
          return ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT);
        }

        await this.codeRepository.activateCode(code.code, consultationId);
      }

      /**
       * Process form templates
       * check if formTemplates are provided
       * check if originalconsultation has formTemplates
       * only add new form templates if they are not already present.
       */
      if ((data.proms && data.proms.length > 0) || data.formTemplates) {
        // initialise proms in the original data if not present
        if (!originalConsultation.proms) {
          originalConsultation.proms = [];
        }
        if (!data.proms) data.proms = [...(data.formTemplates || [])];
        else data.proms = [...data.proms, ...(data.formTemplates || [])];

        //first intersect the originalConsultation.proms.formTemplateId with the ids from data.proms
        // BUG originalConsultation.proms will be populated with the forms and not the ids
        const remainingFormsById = originalConsultation.proms
          //@ts-ignore
          .filter((template: Form) =>
            //@ts-ignore
            data.proms.includes(template.formTemplateId.toString()),
          )
          //@ts-ignore
          .map((template: Form) => template._id.toString());

        const excludedFormsById = originalConsultation.proms
          //@ts-ignore
          .filter((template) => !data.proms.includes(template.formTemplateId.toString()))
          //@ts-ignore
          .map((template) => template._id);
        // delete the excluded forms from the database, but only consultation was successfully updated

        // then filter the data.proms to get the new templates that are not in the originalConsultation.proms
        // BUG data.proms will be populated with the forms and not the ids
        const newPromsByTemplateId = data.proms.filter(
          //@ts-ignore
          (templateId: string) =>
            //@ts-ignore
            !originalConsultation.proms.some((template: Form) => template.formTemplateId.toString() === templateId),
        );
        const newPromsById: string[] = [...remainingFormsById];
        // for each newProms create a new form by template id
        for (const templateId of newPromsByTemplateId) {
          const form = await formRepository.createFormByTemplateId(
            typeof originalConsultation.patientCaseId === 'string'
              ? originalConsultation.patientCaseId
              : originalConsultation.patientCaseId._id.toString(),
            consultationId,
            templateId.toString(),
          );
          if (form?._id) {
            newPromsById.push(form._id.toString());
          }
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
        const excludedFormsById = originalConsultation.proms.map((formId) => formId);
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

  /**
   *
   * @param consultationId - The ID of the consultation to retrieve the form access code for.
   * @throws {ServiceResponse} if an error occurs while fetching the form access code.
   * @description This method retrieves the form access code for a given consultation.
   * It first checks if the consultation exists in the repository, and if it does, it returns the form access code.
   * If the consultation is not found, it returns a failure response.
   * If an error occurs during the retrieval process, it logs the error and returns a failure response.
   * @returns
   */
  async getFormAccessCode(consultationId: string): Promise<ServiceResponse<string | null>> {
    try {
      const consultation = await this.consultationRepository.getConsultationById(consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      // If consultation has a formAccessCode (which is now a code ID), get the actual code string
      if (consultation.formAccessCode) {
        const code = await this.codeRepository.findById(consultation.formAccessCode.toString());
        if (!code) {
          return ServiceResponse.failure("Associated code not found", null, StatusCodes.NOT_FOUND);
        }
        return ServiceResponse.success("Form access code retrieved successfully", code.code);
      }

      return ServiceResponse.success("Form access code retrieved successfully", null);
    } catch (ex) {
      const errorMessage = `Error fetching form access code: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching form access code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *
   * @param consultationId - The ID of the consultation to delete.
   * @throws {ServiceResponse} if an error occurs while deleting the consultation.
   * @description This method deletes a consultation by its ID.
   * It first checks if the consultation exists, and if it does, it deletes it from the repository.
   * If the consultation is not found, it returns a failure response.
   * If an error occurs during the deletion process, it logs the error and returns a failure response.
   * @returns
   */
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

  /**
   *
   * @param caseId - The ID of the patient case.
   * @returns an array of consultations for the specified patient and case.
   * @throws {ServiceResponse} if an error occurs while fetching consultations.
   * @description This method retrieves all consultations for a given case.
   * It queries the consultation repository for consultations that match the provided caseId.
   */
  async getAllConsultations(caseId: string): Promise<ServiceResponse<Consultation[]>> {
    try {
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

  /**
   *
   * @param date - The date in iso format to fetch consultations for that day.
   * @returns an array of consultations for the specified date.
   * @throws {ServiceResponse} if an error occurs while fetching consultations.
   * @description This method retrieves all consultations scheduled for a specific day.
   * It queries the consultation repository for consultations that match the provided date.
   * The date should be in iso format
   */
  async getAllConsultationsOnDay(fromDate: string, toDate: string): Promise<ServiceResponse<Consultation[]>> {
    try {
      const consultations = await this.consultationRepository.getAllConsultationsOnDay(fromDate, toDate);
      return ServiceResponse.success("Consultations retrieved successfully", consultations);
    } catch (ex) {
      const errorMessage = `Error fetching consultations on day: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultations on day.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *
   * @param code - The code to fetch the consultation by.
   * @throws {ServiceResponse} if an error occurs while fetching the consultation.
   * @description This method retrieves a consultation by its code.
   * It first checks if the code exists in the code repository, and if it does, it retrieves the associated consultation.
   * If the code is not found or is not associated with any consultation, it returns a failure response.
   * If an error occurs during the retrieval process, it logs the error and returns a failure response.
   * @returns {Promise<ServiceResponse<Consultation | null>>} - A promise that resolves to a ServiceResponse containing the consultation or an error message.
   */
  async getConsultationByCode(code: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const foundCode = await this.codeRepository.findByCode(code);
      if (!foundCode) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }

      if (!foundCode.consultationId) {
        return ServiceResponse.failure("Code is not associated with any consultation", null, StatusCodes.BAD_REQUEST);
      }

      const consultation = await this.consultationRepository.getConsultationById(
        typeof foundCode.consultationId === "string" ? foundCode.consultationId : foundCode.consultationId.toString(),
      );
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
    // Helper to extract ID from potentially populated field
    const extractId = (field: any): string => {
      if (!field) return "";
      if (typeof field === "string") return field;
      if (typeof field === "object" && field._id) return field._id.toString();
      return field.toString();
    };

    if (
      consultation1.__v === consultation2.__v &&
      consultation1._id?.toString() === consultation2._id?.toString() &&
      consultation1.reasonForConsultation[0] === consultation2.reasonForConsultation[0] &&
      extractId(consultation1.patientCaseId) === extractId(consultation2.patientCaseId)
    )
      return true;
    return false;
  }
}

export const consultationService = new ConsultationService();
