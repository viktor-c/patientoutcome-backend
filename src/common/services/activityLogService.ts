import type { Response } from "express";
import { logger } from "@/common/utils/logger";

export interface ActivityLog {
  timestamp: string;
  username: string;
  action: string;
  details?: string;
  type: "login" | "roleSwitch" | "dashboard" | "formOpen" | "formSubmit" | "info" | "warning" | "error";
  color?: string;
}

/**
 * Activity Log Service for real-time monitoring
 * Uses Server-Sent Events (SSE) to stream logs to connected clients
 */
class ActivityLogService {
  private clients: Set<Response> = new Set();
  private logs: ActivityLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Add a client connection for SSE
   */
  addClient(res: Response): void {
    this.clients.add(res);
    logger.info({ clientCount: this.clients.size }, "📡 Activity log client connected");

    // Send recent logs to new client
    this.logs.slice(-50).forEach((log) => {
      this.sendToClient(res, log);
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(res: Response): void {
    this.clients.delete(res);
    logger.info({ clientCount: this.clients.size }, "📡 Activity log client disconnected");
  }

  /**
   * Log an activity and broadcast to all connected clients
   */
  log(activity: Omit<ActivityLog, "timestamp">): void {
    const log: ActivityLog = {
      ...activity,
      timestamp: new Date().toISOString(),
      color: this.getColorForType(activity.type),
    };

    // Add to memory
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Log to console with color
    const emoji = this.getEmojiForType(activity.type);
    logger.info(
      {
        username: activity.username,
        action: activity.action,
        type: activity.type,
        details: activity.details,
      },
      `${emoji} ${activity.action}`,
    );

    // Broadcast to all connected clients
    this.broadcast(log);
  }

  /**
   * Broadcast log to all connected clients
   */
  private broadcast(log: ActivityLog): void {
    const data = JSON.stringify(log);
    const message = `data: ${data}\n\n`;

    this.clients.forEach((client) => {
      this.sendToClient(client, log);
    });
  }

  /**
   * Send a log entry to a specific client
   */
  private sendToClient(client: Response, log: ActivityLog): void {
    try {
      const data = JSON.stringify(log);
      client.write(`data: ${data}\n\n`);
    } catch (error) {
      logger.error({ error }, "Error sending log to client");
      this.removeClient(client);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): ActivityLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get color for activity type
   */
  private getColorForType(type: ActivityLog["type"]): string {
    const colors: Record<ActivityLog["type"], string> = {
      login: "#4CAF50", // Green
      roleSwitch: "#2196F3", // Blue
      dashboard: "#FF9800", // Orange
      formOpen: "#9C27B0", // Purple
      formSubmit: "#00BCD4", // Cyan
      info: "#607D8B", // Blue Grey
      warning: "#FFC107", // Amber
      error: "#F44336", // Red
    };
    return colors[type] || "#607D8B";
  }

  /**
   * Get emoji for activity type
   */
  private getEmojiForType(type: ActivityLog["type"]): string {
    const emojis: Record<ActivityLog["type"], string> = {
      login: "🔐",
      roleSwitch: "🔄",
      dashboard: "📊",
      formOpen: "📝",
      formSubmit: "✅",
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
    };
    return emojis[type] || "📌";
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    logger.info("🗑️ Activity logs cleared");
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

export const activityLogService = new ActivityLogService();
