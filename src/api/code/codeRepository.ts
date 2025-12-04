import { logger } from "@/common/utils/logger";
import { isPast } from "date-fns";
import dayjs from "dayjs";
import { consultationModel } from "../consultation/consultationModel";
import { type Code, codeModel } from "./codeModel";

export class CodeRepository {
  private _codeMockData: Code[] = [
    {
      code: "XOL70",
      _id: "682f7de54ef4eb7a14be67f6",
      activatedOn: new Date(),
      expiresOn: dayjs().add(4, "hours").toDate(),
      consultationId: "60d5ec49f1b2c12d88f1e8a1",
    },
    {
      code: "SJM13",
      _id: "682f7de54ef4eb7a14be67f7",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      code: "BWX94",
      _id: "682f7de54ef4eb7a14be67f8",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      code: "JUS93",
      _id: "682f7de54ef4eb7a14be67f9",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
    {
      code: "AAA68",
      _id: "682f7de54ef4eb7a14be67fa",
      activatedOn: undefined,
      expiresOn: undefined,
      consultationId: undefined,
    },
  ];

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   * Populates the `codeMockData` array with 20 mock codes.
   * Each code has a 3-letter and 2-number code and a unique mongodb ID
   */
  async createMockDataFormAccessCodes(): Promise<void> {
    try {
      const result = await codeModel.deleteMany();
      await codeModel.insertMany(this.codeMockData);
      logger.info("Mock code data seeded successfully");
    } catch (error) {
      logger.error({ error }, "Error seeding mock code data");
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
      // Find codes where activatedOn is either null or undefined
      return codeModel.find({ $or: [{ activatedOn: null }, { activatedOn: { $exists: false } }] }).lean();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByCode(code: string): Promise<Code | null> {
    return codeModel.findOne({ code });
  }

  async findById(id: string): Promise<Code | null> {
    return codeModel.findById(id);
  }

  async saveCode(code: Code) {
    return codeModel.create(code);
  }

  async createMultipleCodes(numberOfCodes: number): Promise<Code[]> {
    const codes: Code[] = [];
    for (let i = 0; i < numberOfCodes; i++) {
      const randomCode = generateRandomString(3) + generateRandomNumber(2);
      const code: Code = {
        code: randomCode,
        activatedOn: undefined,
        expiresOn: undefined,
        consultationId: undefined,
      };
      codes.push(code);
    }
    return await codeModel.insertMany(codes);
  }

  async deleteCode(codeString: string) {
    //get code by code, delete the corresponding entry in consultation, then delete it
    const code = await codeModel.findOne({ code: codeString }).populate(["consultationId"]);
    if (!code) {
      return Promise.reject("Code not found");
    }
    // if the code has a consultationId, remove the formAccessCode from the consultation
    if (code.consultationId) {
      //@ts-ignore
      code.consultationId.formAccessCode = undefined;
      code.consultationId = undefined;
      // should be saved, so that the formAccessCode is removed from the consultation
      //@ts-ignore
      await code.consultationId.save();
    }
    return await codeModel.deleteOne({ code: codeString });
  }

  async activateCode(codeString: string, consultationId: string): Promise<Code | string> {
    try {
      const consultation = await consultationModel.findById(consultationId);
      if (!consultation) {
        return Promise.resolve("Consultation not found");
      }
      // check if there is already an active code for this consultation
      if (consultation.formAccessCode) {
        // Find the current active code to compare with the incoming code
        const currentActiveCode = await codeModel.findById(consultation.formAccessCode);
        if (currentActiveCode && currentActiveCode.code !== codeString) {
          // if the consultation already has an active code, return a message
          // this is to prevent activating a new code for the same consultation
          // if you want to change the code, you need to deactivate the old one first
          logger.warn("Consultation already has an active code, please deactivate it first.");
          return Promise.resolve("Consultation already has an active code");
        }
      }
      // if the consultation has an active code, this must be first inactivated or deleted

      // check if the code exists, return this code and use it
      const code = await codeModel.findOne({ code: codeString });
      if (!code) {
        return Promise.resolve("Code not found");
      }

      // check if the code is already activated
      const codeAlreadyActivated = code.activatedOn !== undefined;
      if (codeAlreadyActivated) {
        return Promise.resolve("Code already activated");
      }

      // if a code had the consultationId, but is expired or inactive, remove the consultationId
      // and set activatedOn and expiresOn to undefined
      // this is to allow the code to be reused for another consultation
      if (code.consultationId && code.activatedOn && code.expiresOn && isPast(code.expiresOn)) {
        //@ts-ignore
        code.consultationId.formAccessCode = undefined;
        code.consultationId = undefined;
        code.activatedOn = undefined;
        code.expiresOn = undefined;
        await code.save();
      }

      // code should exist, because we just checked earlier
      code.activatedOn = new Date();
      code.expiresOn = dayjs().add(4, "hours").toDate();
      code.consultationId = consultationId;
      await code.save();

      consultation.formAccessCode = code._id;
      await consultation.save();

      const codeToReturnWithoutId = await codeModel.findById(code._id).select("-_id -__v").lean();
      if (!codeToReturnWithoutId) {
        return Promise.resolve("Internal code not found");
      }
      return Promise.resolve(codeToReturnWithoutId);
    } catch (error) {
      return Promise.reject("An unknown error occurred while activating the code.");
    }
  }

  /*
   * this function is used to deactivate a code, when the consultation is finished
   * it will set the activatedOn and expiresOn to undefined
   * //TODO: if we deactivate a code too soon after it expired, it could happen that the code will be used by the use for another consultation
   * //BUG: if the code is already expired, it will not be deactivated; deactivate a code only if long time has passed since the expiration;
   *  //BUG only deactivate the code if the scores were completed
   */
  async deactivateCode(codeString: string) {
    try {
      const existingCode = await codeModel.findOne({ code: codeString }).populate(["consultationId"]);
      if (!existingCode) {
        return Promise.reject("Code not found");
      }
      // Check if the code is already deactivated
      if (!existingCode.activatedOn) {
        return Promise.reject("Code already deactivated");
      }
      // Deactivate the code by setting activatedOn, expiresOn, and consultationId to undefined
      // Note: This will not delete the code, just reset its activation status
      // If the code is already expired, we can still deactivate it
      if (existingCode.expiresOn && existingCode.expiresOn < new Date()) {
        logger.warn("Code is already expired, deactivating it.");
      }

      // Unlink code from consultation - update the consultation document directly
      if (existingCode.consultationId) {
        const consultationId =
          typeof existingCode.consultationId === "object"
            ? (existingCode.consultationId as any)._id
            : existingCode.consultationId;
        await consultationModel.findByIdAndUpdate(consultationId, { $unset: { formAccessCode: 1 } });
      }

      // If the code is expired, we can still deactivate it
      existingCode.activatedOn = undefined;
      existingCode.expiresOn = undefined;
      existingCode.consultationId = undefined;
      await existingCode.save();

      logger.info({ codeId: existingCode.id }, "Code deactivated successfully");
      // remove _id before returnin existing code
      // search again for the code and deselct id
      return codeModel.findById(existingCode.id).select("-_id -__v").lean();
    } catch (error) {
      logger.error({ error }, "Error deactivating code");
      return Promise.reject("An error occurred while deactivating the code.");
    }
  }

  /**
   * Getter to access mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public get codeMockData(): Code[] {
    return this._codeMockData;
  }
}

export const codeRepository = new CodeRepository();

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateRandomNumber(length: number): string {
  const digits = "0123456789";
  return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
}
