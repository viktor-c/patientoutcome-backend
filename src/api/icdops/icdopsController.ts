import type { Request, RequestHandler, Response } from "express";
import { icdopsService } from "./icdopsService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

// ──────────────────────────────────────────────────────────────
// ICD-OPS Controller
// ──────────────────────────────────────────────────────────────

class IcdOpsController {
  /**
   * GET /icdops/icd/search?q=&page=&limit=&kind=
   * Search ICD-10-GM codes
   */
  public searchIcd: RequestHandler = async (req: Request, res: Response) => {
    const { q, page, limit, kind } = req.query as {
      q: string;
      page?: string;
      limit?: string;
      kind?: string;
    };
    const serviceResponse = icdopsService.searchIcd(
      q,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      (kind as any) ?? "category",
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * GET /icdops/ops/search?q=&page=&limit=&kind=
   * Search OPS codes
   */
  public searchOps: RequestHandler = async (req: Request, res: Response) => {
    const { q, page, limit, kind } = req.query as {
      q: string;
      page?: string;
      limit?: string;
      kind?: string;
    };
    const serviceResponse = icdopsService.searchOps(
      q,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      (kind as any) ?? "category",
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * GET /icdops/icd/status
   * Returns version and load status for ICD data
   */
  public getIcdStatus: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = icdopsService.getIcdStatus();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * GET /icdops/ops/status
   * Returns version and load status for OPS data
   */
  public getOpsStatus: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = icdopsService.getOpsStatus();
    return handleServiceResponse(serviceResponse, res);
  };
}

export const icdopsController = new IcdOpsController();
