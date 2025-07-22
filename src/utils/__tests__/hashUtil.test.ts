import { describe, expect, it } from "vitest";
import { comparePasswords, hashPassword } from "../hashUtil";

describe("hashUtil", () => {
  it("should hash a password and verify it correctly", async () => {
    const password = "securePassword123";
    const hashedPassword = await hashPassword(password);

    expect(await comparePasswords(password, hashedPassword)).toBe(true);
  });

  it("should fail verification for incorrect passwords", async () => {
    const password = "securePassword123";
    const wrongPassword = "wrongPassword";
    const hashedPassword = await hashPassword(password);

    expect(await comparePasswords(wrongPassword, hashedPassword)).toBe(false);
  });
});
