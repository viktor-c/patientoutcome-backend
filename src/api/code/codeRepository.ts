import dayjs from "dayjs";
import { type Code, codeModel } from "./codeModel";

export class CodeRepository {
  public codeMockData: Code[] = [
    {
      externalCode: "XOL70",
      _id: "682f7de54ef4eb7a14be67f6",
      activatedOn: new Date(),
      expiresOn: dayjs().add(4, "hours").toDate(),
      consultationId: "60d5ec49f1b2c12d88f1e8a1",
    },
    {
      externalCode: "SJM13",
      _id: "682f7de54ef4eb7a14be67f7",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      externalCode: "BWX94",
      _id: "682f7de54ef4eb7a14be67f8",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      externalCode: "JUS93",
      _id: "682f7de54ef4eb7a14be67f9",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      externalCode: "AAA68",
      _id: "682f7de54ef4eb7a14be67fa",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
  ];

  /**
   * Populates the `codeMockData` array with 20 mock codes.
   * Each code has a 3-letter and 2-number externalCode and a unique UUID as internalCode.
   */
  async createMockDataFormAccessCodes(): Promise<void> {
    try {
      const result = await codeModel.deleteMany();
      await codeModel.insertMany(this.codeMockData);
      console.log("Mock code data seeded successfully");
    } catch (error) {
      console.error("Error seeding mock code data:", error);
      return Promise.reject(error);
    }
  }

  /*
   * this function will return all codes
   * @returns {Promise<Code[]>}
   */
  async findAll() {
    return await codeModel.find();
  }

  /*
   * this function will return all available codes
   * @returns  {Promise<Code[]>}
   */
  async getAllAvailableCodes(): Promise<Code[]> {
    try {
      return await codeModel.find({ activatedOn: null }).lean();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByExternalCode(externalCode: string) {
    return await codeModel.findOne({ externalCode });
  }
  // this function will return the code with the internalCode; internalCode is the id of the code
  async findByInternalCode(internalCode: string) {
    return await codeModel.findById(internalCode);
  }

  async saveCode(internalCode: Code) {
    return await codeModel.create(internalCode);
  }

  async deleteCode(internalCode: string) {
    return await codeModel.deleteOne({ internalCode });
  }

  async activateCode(internalCode: string, consultationId: string): Promise<Code | string> {
    // const consultation = await consultationModel.findById(consultationId).lean();
    // if (!consultation) {
    //   return Promise.resolve("consultation not found");
    // }

    const codeExists = await codeModel.findById(internalCode);
    if (!codeExists) {
      return Promise.resolve("Internal code not found");
    }

    const codeAlreadyActivated = await codeModel.exists({ _id: internalCode, activatedOn: { $ne: null } });

    if (codeAlreadyActivated) {
      return Promise.resolve("code already activated");
    }

    const activeCodeForConsultation = await codeModel.findOne({ consultationId, activatedOn: { $ne: null } });
    if (activeCodeForConsultation) {
      return Promise.resolve("Consultation already has an active code");
    }

    // if a code had the consultationId, but is expired or inactive, remove the consultationId
    // and set activatedOn and expiresOn to undefined
    // this is to allow the code to be reused for another consultation
    const expiredOrInactiveCode = await codeModel.findOne({
      consultationId,
      $or: [{ expiresOn: { $lt: new Date() } }, { activatedOn: undefined }],
    });
    if (expiredOrInactiveCode) {
      expiredOrInactiveCode.consultationId = undefined;
      expiredOrInactiveCode.activatedOn = undefined;
      expiredOrInactiveCode.expiresOn = undefined;
      await expiredOrInactiveCode.save();
    }

    // code should exist, because we just checked earlier
    const code = await codeModel
      .findOneAndUpdate(
        { _id: internalCode },
        { activatedOn: new Date(), expiresOn: dayjs().add(4, "hours"), consultationId },
        { new: true },
      )
      .select("-__v -_id")
      .lean();

    if (!code) {
      return Promise.resolve("Internal code not found");
    }
    return Promise.resolve(code);
  }

  /*
   * this function is used to deactivate a code, when the consultation is finished
   * it will set the activatedOn and expiresOn to undefined
   * //TODO: if we deactivate a code too soon after it expired, it could happen that the code will be used by the use for another consultation
   * //BUG: if the code is already expired, it will not be deactivated; deactivate a code only if long time has passed since the expiration;
   *  //BUG only deactivate the code if the scores were completed
   */
  async deactivateCode(internalCode: string) {
    return await codeModel.findOneAndUpdate(
      { internalCode },
      { activatedOn: undefined, expiresOn: undefined, consultationId: undefined },
      { new: true },
    );
  }
}

export const codeRepository = new CodeRepository();

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateRandomNumber(length: number): string {
  const digits = "0123456789";
  return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
}
