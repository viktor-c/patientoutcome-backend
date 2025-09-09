import { blueprintService } from "@/api/blueprint/blueprintService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";

class BlueprintController {
  public getBlueprints: RequestHandler = async (req: Request, res: Response) => {
    const { page, limit, blueprintFor } = req.query;

    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      blueprintFor: blueprintFor as "case" | "consultation" | "surgery" | undefined,
    };

    const serviceResponse = await blueprintService.findAll(options);
    return handleServiceResponse(serviceResponse, res);
  };

  public getBlueprintById: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await blueprintService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public searchBlueprints: RequestHandler = async (req: Request, res: Response) => {
    const { q, blueprintFor, page, limit } = req.query;

    const options = {
      q: q as string,
      blueprintFor: blueprintFor as "case" | "consultation" | "surgery" | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const serviceResponse = await blueprintService.search(options);
    return handleServiceResponse(serviceResponse, res);
  };

  public createBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const blueprintData = req.body;

    // Get user ID from session
    const userId = (req.session as any)?.userId;
    if (!userId) {
      const serviceResponse = {
        success: false,
        message: "User authentication required",
        responseObject: null,
        statusCode: 401,
      };
      return handleServiceResponse(serviceResponse, res);
    }

    const serviceResponse = await blueprintService.createBlueprint(blueprintData, userId);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const blueprintData = req.body;

    // Get user ID from session
    const userId = (req.session as any)?.userId;
    if (!userId) {
      const serviceResponse = {
        success: false,
        message: "User authentication required",
        responseObject: null,
        statusCode: 401,
      };
      return handleServiceResponse(serviceResponse, res);
    }

    const serviceResponse = await blueprintService.updateBlueprint(id, blueprintData, userId);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await blueprintService.deleteBlueprint(id);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const blueprintController = new BlueprintController();
