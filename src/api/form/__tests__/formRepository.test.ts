import { FormRepository } from "../formRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  formFindOneMock,
  formPopulateMock,
  formLeanMock,
  surgeryFindMock,
  surgeryPopulateMock,
  surgeryLeanMock,
} = vi.hoisted(() => {
  const formLeanMock = vi.fn();
  const formPopulateMock = vi.fn(() => ({ lean: formLeanMock }));
  const formFindOneMock = vi.fn(() => ({ populate: formPopulateMock }));

  const surgeryLeanMock = vi.fn();
  const surgeryPopulateMock = vi.fn(() => ({ lean: surgeryLeanMock }));
  const surgeryFindMock = vi.fn(() => ({ populate: surgeryPopulateMock }));

  return {
    formFindOneMock,
    formPopulateMock,
    formLeanMock,
    surgeryFindMock,
    surgeryPopulateMock,
    surgeryLeanMock,
  };
});

vi.mock("@/api/form/formModel", () => ({
  FormModel: {
    findOne: formFindOneMock,
  },
}));

vi.mock("@/api/surgery/surgeryModel", () => ({
  SurgeryModel: {
    find: surgeryFindMock,
  },
}));

describe("FormRepository.getFormById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches live surgeries to the populated case", async () => {
    const surgeries = [{ _id: "surgery-1", surgeryDate: "2026-03-29T10:00:00.000Z" }];

    formLeanMock.mockResolvedValue({
      _id: "form-1",
      caseId: { _id: "case-1", surgeries: [] },
      consultationId: { _id: "consultation-1" },
      formTemplateId: { _id: "template-1" },
    });
    surgeryLeanMock.mockResolvedValue(surgeries);

    const repository = new FormRepository();
    const form = await repository.getFormById("form-1");

    expect(formFindOneMock).toHaveBeenCalledWith({ _id: "form-1", deletedAt: null });
    expect(formPopulateMock).toHaveBeenCalledWith("caseId consultationId formTemplateId");
    expect(surgeryFindMock).toHaveBeenCalledWith({ patientCase: "case-1" });
    expect(surgeryPopulateMock).toHaveBeenCalledWith(["surgeons"]);
    expect(form?.caseId).toMatchObject({
      _id: "case-1",
      surgeries,
    });
  });
});