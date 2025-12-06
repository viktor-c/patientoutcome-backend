import { activityLogService } from "@/common/services/activityLogService";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

class ActivityLogController {
  /**
   * SSE endpoint for real-time activity logs
   */
  public streamLogs: RequestHandler = (req: Request, res: Response) => {
    // Check if user is authorized (developer role)
    const userRoles = req.session?.roles || [];
    //BUG do no allow doctors to view logs
    if (!userRoles.includes("developer") && !userRoles.includes("admin") && !userRoles.includes("doctor")) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Only developers and admins can view activity logs.",
      });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected", message: "Connected to activity log stream" })}\n\n`);

    // Add client to service
    activityLogService.addClient(res);

    // Handle client disconnect
    req.on("close", () => {
      activityLogService.removeClient(res);
      res.end();
    });
  };

  /**
   * Get recent activity logs
   */
  public getRecentLogs: RequestHandler = (req: Request, res: Response) => {
    // Check if user is authorized
    const userRoles = req.session?.roles || [];
    if (!userRoles.includes("developer") && !userRoles.includes("admin")) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Only developers and admins can view activity logs.",
      });
    }

    const count = Number.parseInt(req.query.count as string) || 50;
    const logs = activityLogService.getRecentLogs(count);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Recent activity logs retrieved",
      responseObject: logs,
      statusCode: StatusCodes.OK,
    });
  };

  /**
   * Clear activity logs
   */
  public clearLogs: RequestHandler = (req: Request, res: Response) => {
    // Check if user is authorized
    const userRoles = req.session?.roles || [];
    if (!userRoles.includes("developer") && !userRoles.includes("admin")) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Only developers and admins can clear activity logs.",
      });
    }

    activityLogService.clearLogs();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Activity logs cleared",
      responseObject: null,
      statusCode: StatusCodes.OK,
    });
  };

  /**
   * Get connection stats
   */
  public getStats: RequestHandler = (req: Request, res: Response) => {
    // Check if user is authorized
    const userRoles = req.session?.roles || [];
    if (!userRoles.includes("developer") && !userRoles.includes("admin")) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied. Only developers and admins can view activity log stats.",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Activity log stats retrieved",
      responseObject: {
        connectedClients: activityLogService.getClientCount(),
        totalLogs: activityLogService.getRecentLogs(10000).length,
      },
      statusCode: StatusCodes.OK,
    });
  };
}

export const activityLogController = new ActivityLogController();
