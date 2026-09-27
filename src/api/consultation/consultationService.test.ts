import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsultationService } from "./consultationService";
import { consultationRepository } from "./consultationRepository";
import { FormRepository } from "../form/formRepository";
import { ServiceResponse } from "../../utils/ServiceResponse";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";

// Mock dependencies
vi.mock("./consultationRepository");
vi.mock("../form/formRepository");
vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    ...actual,
    default: actual.default,
    isValidObjectId: vi.fn(),
  };
});

describe("ConsultationService", () => {
  let consultationService: ConsultationService;
  let formRepository: FormRepository;
  const validCaseId = "677da5d8cb4569ad1c65515f";

  beforeEach(() => {
    formRepository = new FormRepository({} as any);
    consultationService = new ConsultationService();
    (consultationService as any).consultationRepository = consultationRepository;
    (consultationService as any).formRepository = formRepository; // Inject mock
    vi.clearAllMocks();
  });

  describe("createConsultation", () => {
    it("should set 'planned' as default reason if no reason is provided", async () => {
      const caseId = validCaseId;
      const data = {
        dateAndTime: new Date().toISOString(),
        reasonForConsultation: undefined,
        formTemplates: [],
      };
      const createdConsultation = {
        _id: "consultation123",
        ...data,
        reason: ["planned"],
        proms: [],
      };

      (consultationRepository.createConsultation as unknown as vi.Mock).mockResolvedValue(createdConsultation);
      (consultationRepository.getConsultationById as unknown as vi.Mock).mockResolvedValue(createdConsultation);
      (isValidObjectId as vi.Mock).mockReturnValue(true);

      const response = await consultationService.createConsultation(caseId, data as any);

      expect(consultationRepository.createConsultation).toHaveBeenCalledWith(
        caseId,
        expect.objectContaining({
          reason: ["planned"],
        })
      );
      expect(response.success).toBe(true);
      expect(response.responseObject).toEqual(expect.objectContaining(createdConsultation));
    });

    it("should use the provided reason if it exists", async () => {
      const caseId = validCaseId;
      const data = {
        dateAndTime: new Date().toISOString(),
        reasonForConsultation: ["follow-up"],
        formTemplates: [],
      };
      const createdConsultation = {
        _id: "consultation123",
        ...data,
        reason: ["follow-up"],
        proms: [],
      };

      (consultationRepository.createConsultation as unknown as vi.Mock).mockResolvedValue(createdConsultation);
      (consultationRepository.getConsultationById as unknown as vi.Mock).mockResolvedValue(createdConsultation);
      (isValidObjectId as vi.Mock).mockReturnValue(true);

      const response = await consultationService.createConsultation(caseId, data as any);

      expect(consultationRepository.createConsultation).toHaveBeenCalledWith(
        caseId,
        expect.objectContaining({
          reason: ["follow-up"],
        })
      );
      expect(response.success).toBe(true);
      expect(response.responseObject).toEqual(expect.objectContaining(createdConsultation));
    });
  });
});
