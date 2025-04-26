import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { Form } from "./formModel";
import { FormRepository } from "./formRepository";

export class FormService {
  private formRepository: FormRepository;

  constructor(repository: FormRepository = new FormRepository()) {
    this.formRepository = repository;
  }

  async getAllForms(): Promise<ServiceResponse<Form[] | null>> {
    try {
      const forms = await this.formRepository.getAllForms();
      return ServiceResponse.success("Forms found", forms);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving forms.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFormByPatientCaseConsultationFormId(
    patientId: string,
    caseId: string,
    consultationId: string,
    formId: string,
  ): Promise<ServiceResponse<Form | null>> {
    try {
      const form = await this.formRepository.getFormByPatientCaseConsultationFormId(
        patientId,
        caseId,
        consultationId,
        formId,
      );
      if (!form) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Form found", form);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFormById(id: string): Promise<ServiceResponse<Form | null>> {
    try {
      const form = await this.formRepository.getFormById(id);
      if (!form) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Form found", form);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createForm(formData: Form): Promise<ServiceResponse<Form | null>> {
    try {
      const newForm = await this.formRepository.createForm(formData);
      return ServiceResponse.created("Form created successfully", newForm);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while creating the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateForm(id: string, formData: Partial<Form>): Promise<ServiceResponse<Form | null>> {
    try {
      const updatedForm = await this.formRepository.updateForm(id, formData);
      if (!updatedForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Form updated successfully", updatedForm);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while updating the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteForm(id: string): Promise<ServiceResponse<Form | null>> {
    try {
      const deletedForm = await this.formRepository.deleteForm(id);
      if (!deletedForm) {
        return ServiceResponse.failure("Form not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Form deleted successfully", null);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while deleting the form.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const formService = new FormService();
