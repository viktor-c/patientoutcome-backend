import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedFns = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  handleServiceResponseMock: vi.fn(),
}));

vi.mock("@/api/user/userModel", () => ({
  userModel: {
    findOne: mockedFns.findOneMock,
  },
}));

vi.mock("@/common/utils/envConfig", () => ({
  env: {
    NODE_ENV: "production",
  },
}));

vi.mock("@/common/utils/httpHandlers", () => ({
  handleServiceResponse: mockedFns.handleServiceResponseMock,
}));

vi.mock("@/common/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { isSeedingAllowed, seedingMiddleware } from "../seedingUtils";

describe("seedingUtils", () => {
  const mockAdminFound = () => ({
    lean: vi.fn().mockResolvedValue({ _id: "admin-user" }),
  });

  const mockNoAdminFound = () => ({
    lean: vi.fn().mockResolvedValue(null),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_SEED;
    // Admin user exists => not setup mode by default
    mockedFns.findOneMock.mockReturnValue(mockAdminFound());
  });

  describe("isSeedingAllowed", () => {
    it("should deny seeding in production by default", async () => {
      const result = await isSeedingAllowed(false, ["doctor"]);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Mock data is not allowed in production environment");
    });

    it("should allow seeding when ALLOW_SEED=true", async () => {
      process.env.ALLOW_SEED = "true";

      const result = await isSeedingAllowed(false, ["doctor"]);

      expect(result.allowed).toBe(true);
    });

    it("should allow seeding when forceSeeding=true and user is admin", async () => {
      const result = await isSeedingAllowed(true, ["admin"]);

      expect(result.allowed).toBe(true);
    });

    it("should allow seeding in setup mode when no admin exists", async () => {
      mockedFns.findOneMock.mockReturnValue(mockNoAdminFound());

      const result = await isSeedingAllowed(false, ["doctor"]);

      expect(result.allowed).toBe(true);
    });
  });

  describe("seedingMiddleware", () => {
    it("should explicitly allow admin for /department-formtemplate-mappings even when default policy denies", async () => {
      const req = {
        path: "/department-formtemplate-mappings",
        query: {},
        session: { roles: ["admin"] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await seedingMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockedFns.handleServiceResponseMock).not.toHaveBeenCalled();
    });

    it("should deny non-admin for /department-formtemplate-mappings when default policy denies", async () => {
      const req = {
        path: "/department-formtemplate-mappings",
        query: {},
        session: { roles: ["doctor"] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await seedingMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockedFns.handleServiceResponseMock).toHaveBeenCalledTimes(1);
    });

    it("should still allow other routes via forceSeeding=true for admin", async () => {
      const req = {
        path: "/users",
        query: { forceSeeding: "true" },
        session: { roles: ["admin"] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await seedingMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockedFns.handleServiceResponseMock).not.toHaveBeenCalled();
    });
  });
});
