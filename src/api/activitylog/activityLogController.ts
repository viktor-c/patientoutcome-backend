import { activityLogService } from "@/common/services/activityLogService";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

/**
 * Activity Log Controller
 * @class ActivityLogController
 * @description Handles activity log streaming, retrieval, and management for audit trails and monitoring
 */
class ActivityLogController {
  /**
   * Stream real-time activity logs via Server-Sent Events (SSE)
   * @route GET /activitylog/stream
   * @access Developer, Admin
   * @param {Request} req - Express request object with session containing user roles
   * @param {Response} res - Express response object configured for SSE streaming
   * @returns {void} Establishes persistent SSE connection for real-time log streaming
   * @description Opens an SSE connection and streams activity logs in real-time to authorized users.
   * Connection remains open until client disconnects.
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
   * Retrieve recent activity logs
   * @route GET /activitylog/recent
   * @access Developer, Admin
   * @param {Request} req - Express request with optional query parameter 'count' (default: 50)
   * @param {Response} res - Express response object
   * @returns {Response} JSON response with array of recent activity log entries
   * @description Fetches the most recent activity logs up to the specified count
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
   * Clear all activity logs
   * @route DELETE /activitylog
   * @access Developer, Admin
   * @param {Request} req - Express request object with session
   * @param {Response} res - Express response object
   * @returns {Response} JSON response confirming logs have been cleared
   * @description Clears all stored activity logs from memory. Use with caution.
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
   * Get activity log connection statistics
   * @route GET /activitylog/stats
   * @access Developer, Admin
   * @param {Request} req - Express request object with session
   * @param {Response} res - Express response object
   * @returns {Response} JSON response with stats including connected clients count and total log entries
   * @description Returns statistics about the activity log system including connected SSE clients and log count
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
