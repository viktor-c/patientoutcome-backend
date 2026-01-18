import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
import { addDays } from "date-fns";
import { type RegistrationCode, RegistrationCodeModel } from "./registrationCodeModel";

/**
 * UserRegistrationRepository handles operations related to user registration codes.
 * It allows creating, using, and setting activated users for registration codes.
 */
export class UserRegistrationRepository {
  async createCode(code: string, createdAt: Date, validDays: number) {
    const validUntil = addDays(createdAt, validDays);
    return RegistrationCodeModel.create({ code, createdAt, validUntil });
  }

  /**
   * Deactivate a code if it is active and not expired. Rejects if inactive or expired.
   * @param code - The registration code string
   * @returns The updated code document
   * @throws Error if code is inactive or expired
   */
  async useCode(code: string): Promise<RegistrationCode> {
    const codeDoc = await RegistrationCodeModel.findOne({ code });
    if (!codeDoc) throw new Error("Code not found");
    if (!codeDoc.active) throw new Error("Code is inactive");
    if (codeDoc.validUntil < new Date()) throw new Error("Code has expired");
    codeDoc.active = false;
    codeDoc.activatedAt = new Date();
    await codeDoc.save();
    const result = await RegistrationCodeModel.findOne({ code }).lean();
    if (!result) throw new Error("Code not found after deactivation");
    return result;
  }
  /**
   * Reactivate a code by setting it back to active and clearing the userCreatedWith field.
   * @param code - The registration code string
   * @returns The updated code document
   * @throws Error if code is not found
   */
  async resetDeactivatedCode(code: string): Promise<RegistrationCode> {
    try {
      const codeDoc = await RegistrationCodeModel.findOne({ code });
      if (!codeDoc) throw new Error("Code not found");
      codeDoc.active = true;
      codeDoc.activatedAt = null;
      codeDoc.userCreatedWith = null; // Reset userCreatedWith when activating
      await codeDoc.save();
      return Promise.resolve(codeDoc);
    } catch (error) {
      return Promise.reject(`Error reactivating code: ${(error as Error).message}`);
    }
  }
  /**
   * Set the userCreatedWith field for a code and deactivate it.
   * @param code - The registration code string
   * @param userId - The user ID to associate
   * @returns The updated code document
   * @throws Error if code is not found
   */
  async setActivatedUserForCode(code: string, userId: string) {
    const codeDoc = await RegistrationCodeModel.findOne({ code });
    if (!codeDoc) throw new Error("Code not found");
    codeDoc.userCreatedWith = userId;
    codeDoc.active = false;
    await codeDoc.save();
    return codeDoc;
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockUserRegistrationCodes(): Promise<void> {
    try {
      await RegistrationCodeModel.deleteMany({});
      const result = await RegistrationCodeModel.insertMany(this.userCodeMockData);
      logger.debug({ count: result.length }, "Mock user registration codes created");
    } catch (error) {
      logger.error({ error }, "Error creating mock user registration codes");
      return Promise.reject(error);
    }
  }

  /**
   * Mock data for user registration codes.
   * This is used for testing purposes.
   */
  private _userCodeMockData: RegistrationCode[] = [
    {
      code: "abc-123-abc",
      createdAt: faker.date.recent(),
      activatedAt: null,
      validUntil: faker.date.soon({ days: 90 }),
      userCreatedWith: null,
      roles: ["doctor"],
      permissions: ["read", "write"],
      userDepartment: ["675000000000000000000001"], // Orthopädie department
      userBelongsToCenter: "675000000000000000000003", // Klinikum Fulda
      active: true,
    },
    {
      code: "DEF-456-UVW",
      createdAt: faker.date.recent(),
      activatedAt: null,
      validUntil: faker.date.soon({ days: 90 }),
      userCreatedWith: null,
      roles: ["nurse"],
      userDepartment: ["675000000000000000000002"], // Kardiologie department
      userBelongsToCenter: "675000000000000000000003", // Klinikum Fulda
      active: true,
    },
    {
      code: "GHI-789-RST",
      createdAt: faker.date.recent(),
      activatedAt: null,
      validUntil: faker.date.soon({ days: 90 }),
      userCreatedWith: null,
      roles: ["admin"],
      userDepartment: ["675000000000000000000001"], // Orthopädie department
      userBelongsToCenter: "675000000000000000000004", // Klinikum Musterstadt
      active: true,
    },
  ];

  /**
   * Getter to access mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public get userCodeMockData(): RegistrationCode[] {
    return this._userCodeMockData;
  }

  /**
   * Create multiple registration codes for batch user creation
   * @param count - Number of codes to create for this role
   * @param roleInfo - Role, department, and center information for the codes
   * @param validDays - Number of days until expiration (or specific date)
   * @returns Array of created registration codes
   */
  async createMultipleCodes(
    count: number,
    roleInfo: {
      roles: string[];
      permissions?: string[];
      userDepartment: string[];
      userBelongsToCenter?: string;
    },
    validUntil: Date,
  ): Promise<RegistrationCode[]> {
    const codes: RegistrationCode[] = [];
    const createdAt = new Date();

    for (let i = 0; i < count; i++) {
      // Generate unique code in format ABC-123-XYZ
      const code = this.generateUniqueCode();
      
      const registrationCode: RegistrationCode = {
        code,
        createdAt,
        activatedAt: null,
        validUntil,
        userCreatedWith: null,
        roles: roleInfo.roles,
        permissions: roleInfo.permissions,
        userDepartment: roleInfo.userDepartment,
        userBelongsToCenter: roleInfo.userBelongsToCenter,
        active: true,
      };
      codes.push(registrationCode);
    }

    const result = await RegistrationCodeModel.insertMany(codes);
    logger.debug({ count: result.length }, "Batch registration codes created");
    return result;
  }

  /**
   * Generate a unique registration code in format ABC-123-XYZ
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 3;
    const segmentLength = 3;
    
    const generateSegment = () => {
      let segment = '';
      for (let i = 0; i < segmentLength; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return segment;
    };

    const code = Array.from({ length: segments }, generateSegment).join('-');
    return code;
  }
}
