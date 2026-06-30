/**
 * @file Code Access Log Repository
 * @module api/code/codeAccessLogRepository
 * @description Repository for managing code access logs and form completion tracking
 */

import { logger } from "@/common/utils/logger";
import { type CodeAccessLog, CodeAccessLogModel, type FormCompletionLog } from "./codeAccessLogModel";

export class CodeAccessLogRepository {
  /**
   * Create a new access log entry when a code is used
   */
  async createAccessLog(data: {
    codeId: string;
    code: string;
    patientCaseId: string;
    consultationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<CodeAccessLog> {
    try {
      const accessLog = await CodeAccessLogModel.create({
        ...data,
        accessedAt: new Date(),
        sessionStartedAt: new Date(),
        formsCompleted: [],
        successful: false, // Will be updated when session completes
      });

      logger.info({ accessLogId: accessLog._id, code: data.code }, "Access log created");
      return accessLog.toObject();
    } catch (error) {
      logger.error({ error, data }, "Error creating access log");
      throw new Error("Failed to create access log");
    }
  }

  /**
   * Update an access log with form completion information
   */
  async addFormCompletion(
    accessLogId: string,
    formCompletion: FormCompletionLog
  ): Promise<CodeAccessLog | null> {
    try {
      const accessLog = await CodeAccessLogModel.findByIdAndUpdate(
        accessLogId,
        {
          $push: { formsCompleted: formCompletion },
          sessionEndedAt: formCompletion.completedAt,
        },
        { new: true }
      ).lean();

      if (!accessLog) {
        logger.warn({ accessLogId }, "Access log not found for form completion");
        return null;
      }

      logger.info({ accessLogId, formId: formCompletion.formId }, "Form completion added to access log");
      return accessLog;
    } catch (error) {
      logger.error({ error, accessLogId, formCompletion }, "Error adding form completion");
      throw new Error("Failed to add form completion");
    }
  }

  /**
   * Mark an access session as completed and calculate total duration
   */
  async completeSession(accessLogId: string, successful = true): Promise<CodeAccessLog | null> {
    try {
      const accessLog = await CodeAccessLogModel.findById(accessLogId);
      if (!accessLog) {
        logger.warn({ accessLogId }, "Access log not found for session completion");
        return null;
      }

      const now = new Date();
      const totalDurationMs = now.getTime() - new Date(accessLog.sessionStartedAt).getTime();

      accessLog.sessionEndedAt = now;
      accessLog.totalSessionDurationMs = totalDurationMs;
      accessLog.successful = successful;
      
      await accessLog.save();

      logger.info(
        { accessLogId, totalDurationMs, successful, formsCount: accessLog.formsCompleted.length },
        "Session completed"
      );
      
      return accessLog.toObject();
    } catch (error) {
      logger.error({ error, accessLogId }, "Error completing session");
      throw new Error("Failed to complete session");
    }
  }

  /**
   * Get all access logs for a specific code
   */
  async getAccessLogsByCode(code: string): Promise<CodeAccessLog[]> {
    try {
      return await CodeAccessLogModel.find({ code })
        .sort({ accessedAt: -1 })
        .lean();
    } catch (error) {
      logger.error({ error, code }, "Error retrieving access logs by code");
      throw new Error("Failed to retrieve access logs");
    }
  }

  /**
   * Get all access logs for a specific patient case
   */
  async getAccessLogsByPatientCase(patientCaseId: string): Promise<CodeAccessLog[]> {
    try {
      return await CodeAccessLogModel.find({ patientCaseId })
        .sort({ accessedAt: -1 })
        .lean();
    } catch (error) {
      logger.error({ error, patientCaseId }, "Error retrieving access logs by patient case");
      throw new Error("Failed to retrieve access logs");
    }
  }

  /**
   * Get statistics for a code's usage
   */
  async getCodeAccessStatistics(code: string): Promise<{
    totalAccesses: number;
    successfulSessions: number;
    totalFormsCompleted: number;
    averageSessionDuration: number;
    lastAccessedAt?: Date;
  }> {
    try {
      const logs = await CodeAccessLogModel.find({ code }).lean();

      const stats = {
        totalAccesses: logs.length,
        successfulSessions: logs.filter(log => log.successful).length,
        totalFormsCompleted: logs.reduce((sum, log) => sum + log.formsCompleted.length, 0),
        averageSessionDuration: 0,
        lastAccessedAt: logs.length > 0 ? logs[0].accessedAt : undefined,
      };

      const completedSessions = logs.filter(log => log.totalSessionDurationMs !== undefined);
      if (completedSessions.length > 0) {
        const totalDuration = completedSessions.reduce(
          (sum, log) => sum + (log.totalSessionDurationMs || 0),
          0
        );
        stats.averageSessionDuration = Math.round(totalDuration / completedSessions.length);
      }

      return stats;
    } catch (error) {
      logger.error({ error, code }, "Error getting code access statistics");
      throw new Error("Failed to get code access statistics");
    }
  }
}

export const codeAccessLogRepository = new CodeAccessLogRepository();
