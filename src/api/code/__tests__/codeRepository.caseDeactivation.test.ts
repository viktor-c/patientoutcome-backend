import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { codeModel } from "../codeModel";
import { CodeRepository } from "../codeRepository";

describe("CodeRepository case-code deactivation", () => {
  const repo = new CodeRepository();

  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://patientmanager:1234Test@localhost:27017/patientoutcome?authSource=admin",
    );
  });

  afterAll(async () => {
    await codeModel.deleteMany({ code: /^CASE/ });
    await mongoose.disconnect();
  });

  it("keeps patient-case form access codes active after form completion", async () => {
    const patientCaseId = new mongoose.Types.ObjectId().toString();

    await codeModel.deleteOne({ code: "CASE202" });
    const codeDocument = await codeModel.create({
      code: "CASE202",
      activatedOn: new Date(),
      expiresOn: new Date(Date.now() + 60_000),
      patientCaseId,
    });

    const before = await codeModel.findById(codeDocument._id).lean();
    expect(before?.patientCaseId?.toString()).toBe(patientCaseId);
    expect(before?.consultationId).toBeUndefined();
    expect(before?.activatedOn).toBeTruthy();

    await repo.deactivateCode("CASE202");

    const after = await codeModel.findById(codeDocument._id).lean();
    expect(after?.patientCaseId?.toString()).toBe(patientCaseId);
    expect(after?.consultationId).toBeUndefined();
    expect(after?.activatedOn).toBeTruthy();
    expect(after?.expiresOn).toBeTruthy();
  });
});
