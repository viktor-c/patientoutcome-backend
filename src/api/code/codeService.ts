import { ServiceResponse } from "@/common/models/serviceResponse";
import { consultationRepository } from "@/api/consultation/consultationRepository";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { buildConsultationAccessWindow } from "@/api/consultation/consultationAccessWindow";
import { FormModel } from "@/api/form/formModel";
import { FormRepository } from "@/api/form/formRepository";
import type { Code } from "./codeModel";
import { CodeRepository } from "./codeRepository";
import { CodeAccessLogRepository } from "./codeAccessLogRepository";
import type { CodeAccessLog, FormCompletionLog } from "./codeAccessLogModel";

const formRepository = new FormRepository();
const codeAccessLogRepository = new CodeAccessLogRepository();
export { DEFAULT_CODE_LIFE_MS, parseCodeLifeToMs } from "./codeLifeUtils";

function isCodeExpired(codeDocument: Code): boolean {
  if (!codeDocument.expiresOn) return false;
  return new Date(codeDocument.expiresOn).getTime() < Date.now();
}

async function resolveActiveConsultationForCode(codeDocument: Code) {
  if (isCodeExpired(codeDocument)) {
    return null;
  }

  if (codeDocument.consultationId) {
    const consultation = await consultationRepository.getConsultationById(codeDocument.consultationId.toString());
    if (!consultation) {
      return null;
    }

    const accessWindow = await buildConsultationAccessWindow(consultation);
    if (!accessWindow?.isActive) {
      return null;
    }

    return consultation;
  }

  if (!codeDocument.patientCaseId) {
    return null;
  }

  const consultations = await consultationRepository.getAllConsultations(codeDocument.patientCaseId.toString());
  if (!Array.isArray(consultations) || consultations.length === 0) {
    return null;
  }

  // Get current date (without time component for comparison)
  const now = new Date();
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nowTime = now.getTime();

  // Build list of consultations with their access windows and completion status
  const withActiveWindow = await Promise.all(
    consultations.map(async (consultation) => {
      const accessWindow = await buildConsultationAccessWindow(consultation);
      
      // Check if consultation has unfilled forms
      let hasUnfilledForms = false;
      if (Array.isArray(consultation.proms) && consultation.proms.length > 0) {
        // Load the forms to check if they're filled
        const forms = await FormModel.find({ 
          _id: { $in: consultation.proms },
          deletedAt: null 
        }).lean();
        
        // A consultation is considered unfilled if it has at least one form without patient data
        hasUnfilledForms = forms.some(form => !form.patientFormData);
      } else {
        // If no forms exist yet, consider it unfilled
        hasUnfilledForms = true;
      }
      
      return {
        consultation,
        accessWindow,
        hasUnfilledForms,
      };
    }),
  );

  // Filter to only active consultations with unfilled forms
  const activeUnfilledConsultations = withActiveWindow.filter(
    (entry) => entry.accessWindow?.isActive && entry.hasUnfilledForms
  );

  if (activeUnfilledConsultations.length === 0) {
    return null;
  }

  // Sort by nearest date (ignoring time), preferring past over future when equally distant
  const sorted = activeUnfilledConsultations.sort((left, right) => {
    const leftDate = new Date(left.consultation.dateAndTime || 0);
    const rightDate = new Date(right.consultation.dateAndTime || 0);
    
    // Convert to date-only for comparison (ignoring time)
    const leftDateOnly = new Date(leftDate.getFullYear(), leftDate.getMonth(), leftDate.getDate());
    const rightDateOnly = new Date(rightDate.getFullYear(), rightDate.getMonth(), rightDate.getDate());
    
    const leftDistance = Math.abs(leftDateOnly.getTime() - nowDateOnly.getTime());
    const rightDistance = Math.abs(rightDateOnly.getTime() - nowDateOnly.getTime());
    
    // If distances are equal, prefer the one in the past
    if (leftDistance === rightDistance) {
      // Negative value means past, positive means future
      const leftIsPast = leftDateOnly.getTime() <= nowDateOnly.getTime();
      const rightIsPast = rightDateOnly.getTime() <= nowDateOnly.getTime();
      
      if (leftIsPast && !rightIsPast) return -1; // Left is past, prefer it
      if (!leftIsPast && rightIsPast) return 1;  // Right is past, prefer it
      
      // Both in past or both in future, use actual time to break tie
      return leftDate.getTime() - rightDate.getTime();
    }
    
    // Different distances, use the nearest one
    return leftDistance - rightDistance;
  });

  return sorted[0]?.consultation || null;
}

class CodeService {
  private codeRepository: CodeRepository;
  constructor(repository: CodeRepository = new CodeRepository()) {
    this.codeRepository = repository;
  }
  async findAll(): Promise<ServiceResponse<Code[] | null>> {
    try {
      const codes = await this.codeRepository.findAll();
      return ServiceResponse.success("Codes found", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving codes.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllAvailableCodes(): Promise<ServiceResponse<Code[]>> {
    try {
      const codes = await this.codeRepository.getAllAvailableCodes();
      return ServiceResponse.success("Available codes retrieved successfully", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving available codes.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async activateCode(code: string, consultationId: string): Promise<ServiceResponse<Code | null>> {
    try {
      const foundCode = await this.codeRepository.activateCode(code, consultationId);
      if (typeof foundCode === "string") {
        if (foundCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Code already activated") {
          return ServiceResponse.failure("Code already activated", null, StatusCodes.CONFLICT);
        } else if (foundCode === "Consultation not found") {
          return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Consultation already has an active code") {
          return ServiceResponse.failure("Consultation already has an active code", null, StatusCodes.CONFLICT);
        }
      } else if (foundCode === null) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
      }
      if (typeof foundCode === "object" && foundCode !== null) {
        return ServiceResponse.success("Code activated successfully", foundCode);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error activating code");
      return ServiceResponse.failure(
        "An error occurred while activating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async activateCodeForPatientCase(code: string, caseId: string): Promise<ServiceResponse<Code | null>> {
    try {
      const foundCode = await this.codeRepository.activateCodeForPatientCase(code, caseId);
      if (typeof foundCode === "string") {
        if (foundCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Code already activated") {
          return ServiceResponse.failure("Code already activated", null, StatusCodes.CONFLICT);
        } else if (foundCode === "Patient case not found") {
          return ServiceResponse.failure("Patient case not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Patient case already has an active code") {
          return ServiceResponse.failure("Patient case already has an active code", null, StatusCodes.CONFLICT);
        }
      } else if (foundCode === null) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
      }
      if (typeof foundCode === "object" && foundCode !== null) {
        return ServiceResponse.success("Code activated successfully", foundCode);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error activating code for patient case");
      return ServiceResponse.failure(
        "An error occurred while activating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getActiveCodeForPatientCase(caseId: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.getActiveCodeByPatientCaseId(caseId);
      if (!code) {
        return ServiceResponse.failure("No active code for patient case", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", code);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving active case code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivateCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const foundCode = await this.codeRepository.deactivateCode(code);
      if (typeof foundCode === "object" && foundCode !== null) {
        return ServiceResponse.success("Code deactivated successfully", foundCode);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        } else if (error === "Code already deactivated") {
          return ServiceResponse.failure("Code already deactivated", null, StatusCodes.CONFLICT);
        }
      } else if (error === null) {
        return ServiceResponse.failure("External code not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.failure(
        "An unknown error occurred while deactivating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async renewCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const renewedCode = await this.codeRepository.renewCode(code);
      if (typeof renewedCode === "string") {
        if (renewedCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        }
        if (renewedCode === "Code is not active") {
          return ServiceResponse.failure("Code is not active", null, StatusCodes.CONFLICT);
        }
      }

      if (renewedCode && typeof renewedCode === "object") {
        return ServiceResponse.success("Code renewed successfully", renewedCode);
      }

      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error renewing code");
      return ServiceResponse.failure("An error occurred while renewing the code.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async setCodeActivationStart(code: string, activatedOn: Date): Promise<ServiceResponse<Code | null>> {
    try {
      const updatedCode = await this.codeRepository.setCodeActivationStart(code, activatedOn);
      if (typeof updatedCode === "string") {
        if (updatedCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        }
        if (updatedCode === "Code is not linked") {
          return ServiceResponse.failure("Code is not linked", null, StatusCodes.CONFLICT);
        }
      }

      if (updatedCode && typeof updatedCode === "object") {
        return ServiceResponse.success("Code activation start updated successfully", updatedCode);
      }

      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error updating code activation start");
      return ServiceResponse.failure(
        "An error occurred while updating the code activation start.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async updateCodeValidity(
    code: string,
    activatedOn: Date,
    expiresOn: Date,
  ): Promise<ServiceResponse<Code | null>> {
    try {
      const updatedCode = await this.codeRepository.updateCodeValidity(code, activatedOn, expiresOn);
      if (typeof updatedCode === "string") {
        if (updatedCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        }
        if (updatedCode === "Code is not linked") {
          return ServiceResponse.failure("Code is not linked", null, StatusCodes.CONFLICT);
        }
      }

      if (updatedCode && typeof updatedCode === "object") {
        return ServiceResponse.success("Code validity updated successfully", updatedCode);
      }

      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error updating code validity");
      return ServiceResponse.failure(
        "An error occurred while updating code validity.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async addCodes(
    numberOfCodes: number,
    consultationDate?: Date
  ): Promise<ServiceResponse<Code[] | null>> {
    try {
      // this should not happen, because zod already validates the input
      // but we keep it here just in case
      // to ensure that we do not try to create an invalid number of codes
      if (Number.isNaN(numberOfCodes) || numberOfCodes <= 0 || numberOfCodes > 10) {
        return ServiceResponse.failure("Invalid number of codes specified", null, StatusCodes.BAD_REQUEST);
      }
      const codes = await this.codeRepository.createMultipleCodes(
        numberOfCodes,
        consultationDate
      );
      if (codes.length === 0) {
        return ServiceResponse.failure("No codes were created", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      return ServiceResponse.created("Codes created successfully", codes);
    } catch (error) {
      logger.error({ error }, "Error adding codes");
      return ServiceResponse.failure("An error occurred while adding codes.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCode(code: string): Promise<ServiceResponse<null>> {
    try {
      const result = await this.codeRepository.deleteCode(code);
      return ServiceResponse.noContent("Code deleted successfully", null);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "Code not found") return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.failure(
        "An error occurred while deleting the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const codeDocument = await this.codeRepository.findByCode(code);
      if (!codeDocument) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", codeDocument);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *
   * @param internalCode
   * @returns
   */
  async getCodeById(id: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.findById(id);
      if (!code) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", code);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllCodes(): Promise<ServiceResponse<Code[] | null>> {
    try {
      const codes = await this.codeRepository.findAll();
      return ServiceResponse.success("Codes retrieved successfully", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the codes.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateCode(code: string): Promise<ServiceResponse<boolean>> {
    try {
      const codeDocument = await this.codeRepository.findByCode(code);
      if (!codeDocument) {
        return ServiceResponse.failure("Code not found", false, StatusCodes.NOT_FOUND);
      }
      
      // Check if code is archived
      if (codeDocument.archivedOn) {
        return ServiceResponse.failure("Code has been archived and is no longer valid", false, StatusCodes.FORBIDDEN);
      }
      
      if (!codeDocument.activatedOn) {
        return ServiceResponse.failure("Code is not active", false, StatusCodes.BAD_REQUEST);
      }

      if (isCodeExpired(codeDocument)) {
        return ServiceResponse.failure("Code is expired", false, StatusCodes.BAD_REQUEST);
      }

      const consultation = await resolveActiveConsultationForCode(codeDocument);
      if (!consultation) {
        return ServiceResponse.failure(
          "Consultation is not currently active for external form access",
          false,
          StatusCodes.BAD_REQUEST,
        );
      }

      return ServiceResponse.success("Code is valid", true);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while checking the external code.",
        false,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetConsultationFormsByCode(code: string): Promise<ServiceResponse<{ recreatedCount: number } | null>> {
    try {
      const codeDocument = await this.codeRepository.findByCode(code);
      if (!codeDocument) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }

      if (!codeDocument.consultationId) {
        return ServiceResponse.failure("Code is not linked to a consultation", null, StatusCodes.CONFLICT);
      }

      const consultationId = codeDocument.consultationId.toString();

      // Find all active forms for this consultation and remember their template IDs and caseId
      const existingForms = await FormModel.find({ consultationId, deletedAt: null }).lean();

      if (existingForms.length === 0) {
        return ServiceResponse.success("No forms found for this consultation", { recreatedCount: 0 });
      }

      // Collect unique (caseId, formTemplateId) pairs to recreate
      type FormSeed = { caseId: string; formTemplateId: string };
      const toRecreate: FormSeed[] = existingForms
        .filter((f) => f.formTemplateId)
        .map((f) => ({
          caseId: f.caseId?.toString() ?? "",
          formTemplateId: f.formTemplateId?.toString() ?? "",
        }))
        .filter((f) => f.caseId && f.formTemplateId);

      // Hard-delete the old form documents
      await FormModel.deleteMany({ consultationId, deletedAt: null });

      // Recreate each form fresh from its template
      let recreatedCount = 0;
      const recreatedFormIds: string[] = [];
      for (const seed of toRecreate) {
        try {
          const recreatedForm = await formRepository.createFormByTemplateId(seed.caseId, consultationId, seed.formTemplateId);
          if (recreatedForm?._id) {
            recreatedFormIds.push(recreatedForm._id.toString());
          }
          recreatedCount++;
        } catch (err) {
          logger.error({ err, consultationId, ...seed }, "Failed to recreate form during consultation reset");
        }
      }

      await consultationRepository.updateConsultation(consultationId, { proms: recreatedFormIds });

      return ServiceResponse.success("Consultation forms reset successfully", { recreatedCount });
    } catch (error) {
      logger.error({ error }, "Error resetting consultation forms by code");
      return ServiceResponse.failure(
        "An error occurred while resetting consultation forms.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Archive a code instead of deleting it
   */
  async archiveCode(code: string, userId?: string): Promise<ServiceResponse<Code | null>> {
    try {
      const result = await this.codeRepository.archiveCode(code, userId);
      
      if (typeof result === "string") {
        if (result === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        }
        if (result === "Code is already archived") {
          return ServiceResponse.failure("Code is already archived", null, StatusCodes.CONFLICT);
        }
        return ServiceResponse.failure(result, null, StatusCodes.BAD_REQUEST);
      }
      
      return ServiceResponse.success("Code archived successfully", result);
    } catch (error) {
      logger.error({ error, code }, "Error archiving code");
      return ServiceResponse.failure(
        "An error occurred while archiving the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Restore an archived code
   */
  async restoreCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const result = await this.codeRepository.restoreCode(code);
      
      if (typeof result === "string") {
        if (result === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        }
        if (result === "Code is not archived") {
          return ServiceResponse.failure("Code is not archived", null, StatusCodes.CONFLICT);
        }
        return ServiceResponse.failure(result, null, StatusCodes.BAD_REQUEST);
      }
      
      return ServiceResponse.success("Code restored successfully", result);
    } catch (error) {
      logger.error({ error, code }, "Error restoring code");
      return ServiceResponse.failure(
        "An error occurred while restoring the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get access logs for a specific code
   */
  async getCodeAccessLogs(code: string): Promise<ServiceResponse<CodeAccessLog[]>> {
    try {
      const logs = await codeAccessLogRepository.getAccessLogsByCode(code);
      return ServiceResponse.success("Access logs retrieved successfully", logs);
    } catch (error) {
      logger.error({ error, code }, "Error retrieving access logs");
      return ServiceResponse.failure(
        "An error occurred while retrieving access logs.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get access statistics for a code
   */
  async getCodeAccessStatistics(code: string): Promise<ServiceResponse<{
    totalAccesses: number;
    successfulSessions: number;
    totalFormsCompleted: number;
    averageSessionDuration: number;
    lastAccessedAt?: Date;
  }>> {
    try {
      const stats = await codeAccessLogRepository.getCodeAccessStatistics(code);
      return ServiceResponse.success("Access statistics retrieved successfully", stats);
    } catch (error) {
      logger.error({ error, code }, "Error retrieving access statistics");
      return ServiceResponse.failure(
        "An error occurred while retrieving access statistics.",
        {
          totalAccesses: 0,
          successfulSessions: 0,
          totalFormsCompleted: 0,
          averageSessionDuration: 0,
        },
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create an access log when a code is used
   */
  async createCodeAccessLog(data: {
    codeId: string;
    code: string;
    patientCaseId: string;
    consultationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ServiceResponse<CodeAccessLog | null>> {
    try {
      const accessLog = await codeAccessLogRepository.createAccessLog(data);
      return ServiceResponse.success("Access log created successfully", accessLog);
    } catch (error) {
      logger.error({ error, data }, "Error creating access log");
      return ServiceResponse.failure(
        "An error occurred while creating access log.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add form completion to an access log
   */
  async addFormCompletionToAccessLog(
    accessLogId: string,
    formCompletion: FormCompletionLog
  ): Promise<ServiceResponse<CodeAccessLog | null>> {
    try {
      const updatedLog = await codeAccessLogRepository.addFormCompletion(accessLogId, formCompletion);
      if (!updatedLog) {
        return ServiceResponse.failure("Access log not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Form completion added successfully", updatedLog);
    } catch (error) {
      logger.error({ error, accessLogId, formCompletion }, "Error adding form completion");
      return ServiceResponse.failure(
        "An error occurred while adding form completion.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Complete an access session
   */
  async completeAccessSession(
    accessLogId: string,
    successful = true
  ): Promise<ServiceResponse<CodeAccessLog | null>> {
    try {
      const completedLog = await codeAccessLogRepository.completeSession(accessLogId, successful);
      if (!completedLog) {
        return ServiceResponse.failure("Access log not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Session completed successfully", completedLog);
    } catch (error) {
      logger.error({ error, accessLogId }, "Error completing session");
      return ServiceResponse.failure(
        "An error occurred while completing session.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const codeService = new CodeService();
