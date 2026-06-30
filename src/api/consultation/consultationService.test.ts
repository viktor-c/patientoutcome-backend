import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsultationService } from "./consultationService";
import { ConsultationRepository } from "./consultationRepository";
import { FormRepository } from "../form/formRepository";
import { ServiceResponse } from "../../utils/ServiceResponse";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";

// Mock dependencies
vi.mock("./consultationRepository");
vi.mock("../form/formRepository");
vi.mock("mongoose", () => ({
  ...vi.importActual("mongoose"),
  isValidObjectId: vi.fn(),
}));

describe("ConsultationService", () => {
  let consultationService: ConsultationService;
  let consultationRepository: ConsultationRepository;
  let formRepository: FormRepository;

  beforeEach(() => {
    consultationRepository = new ConsultationRepository({} as any);
    formRepository = new FormRepository({} as any);
    consultationService = new ConsultationService(consultationRepository);
    (consultationService as any).formRepository = formRepository; // Inject mock
    vi.clearAllMocks();
  });

  describe("createConsultation", () => {
    it("should set 'planned' as default reason if no reason is provided", async () => {
      const caseId = "case123";
      const data = {
        dateAndTime: new Date().toISOString(),
        formTemplates: [],
      };
      const createdConsultation = {
        _id: "consultation123",
        ...data,
        reason: "planned",
        proms: [],
      };

      (consultationRepository.createConsultation as vi.Mock).mockResolvedValue(createdConsultation);
      (isValidObjectId as vi.Mock).mockReturnValue(true);

      const response = await consultationService.createConsultation(caseId, data as any);

      expect(consultationRepository.createConsultation).toHaveBeenCalledWith(
        caseId,
        expect.objectContaining({
          reason: "planned",
        })
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdConsultation);
    });

    it("should use the provided reason if it exists", async () => {
      const caseId = "case123";
      const data = {
        dateAndTime: new Date().toISOString(),
        reason: "follow-up",
        formTemplates: [],
      };
      const createdConsultation = {
        _id: "consultation123",
        ...data,
        proms: [],
      };

      (consultationRepository.createConsultation as vi.Mock).mockResolvedValue(createdConsultation);
      (isValidObjectId as vi.Mock).mockReturnValue(true);

      const response = await consultationService.createConsultation(caseId, data as any);

      expect(consultationRepository.createConsultation).toHaveBeenCalledWith(
        caseId,
        expect.objectContaining({
          reason: "follow-up",
        })
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdConsultation);
    });
  });
});
