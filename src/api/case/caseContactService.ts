/**
 * @file Case Contact Service
 * @module api/case/caseContactService
 * @description Handles patient contact reports for archived or inaccessible case access codes.
 * Sends notifications to physicians (supervisors) associated with the case.
 */

import { logger } from "@/common/utils/logger";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";
import { emailTemplateService, type SupportedLocale } from "@/common/services/emailTemplateService";
import { feedbackEnv } from "@/common/utils/feedbackEnvConfig";
import nodemailer from "nodemailer";
import { codeRepository } from "@/api/code/codeRepository";
import { PatientCaseModel, type PatientCase } from "@/api/case/patientCaseModel";
import { userModel } from "@/api/user/userModel";
import type { User } from "@/api/user/userModel";

interface CaseContactData {
  code: string;
  message: string;
  submittedAt: Date;
  locale?: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

class CaseContactService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const useSecure = feedbackEnv.SMTP_SECURE || feedbackEnv.SMTP_PORT === 465;

      this.transporter = nodemailer.createTransport({
        host: feedbackEnv.SMTP_HOST,
        port: feedbackEnv.SMTP_PORT,
        secure: useSecure,
        auth: {
          user: feedbackEnv.SMTP_USER,
          pass: feedbackEnv.SMTP_PASS,
        },
        requireTLS: feedbackEnv.SMTP_PORT === 587,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === "production",
        },
      });

      logger.debug(
        {
          host: feedbackEnv.SMTP_HOST,
          port: feedbackEnv.SMTP_PORT,
          secure: useSecure,
        },
        "caseContactService: Email transporter configured",
      );
    }

    return this.transporter;
  }

  /**
   * Send contact report to physicians involved in the case
   */
  async sendCaseContactReport(data: CaseContactData): Promise<ServiceResponse<null>> {
    try {
      // 1. Find the code
      const foundCode = await codeRepository.findByCode(data.code);
      if (!foundCode) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }

      // 2. Get the patient case ID
      if (!foundCode.patientCaseId) {
        return ServiceResponse.failure(
          "Code is not associated with a patient case",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      const caseId = foundCode.patientCaseId.toString();

      // 3. Get the patient case with populated supervisors
      const patientCase = (await PatientCaseModel.findById(caseId)
        .populate("supervisors")
        .lean()) as PatientCase | null;
      if (!patientCase) {
        return ServiceResponse.failure("Patient case not found", null, StatusCodes.NOT_FOUND);
      }

      // 4. Get supervisor emails
      const supervisorIds = patientCase.supervisors.map((id: any) => id.toString());
      if (supervisorIds.length === 0) {
        logger.warn({ caseId }, "caseContactService: No supervisors found for case");
        return ServiceResponse.failure(
          "No physicians assigned to this case",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      const supervisors = await userModel.find({ _id: { $in: supervisorIds } }).lean<User[]>();
      const physicianEmails = supervisors
        .filter((user) => user.email)
        .map((user) => ({ email: user.email, name: user.name }));

      if (physicianEmails.length === 0) {
        logger.warn({ caseId, supervisorIds }, "caseContactService: No valid emails found for supervisors");
        return ServiceResponse.failure(
          "No valid email addresses found for physicians",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      // 5. Send emails to all physicians
      const locale = (data.locale?.split("-")[0] as SupportedLocale) || "en";
      const sendResults = await Promise.all(
        physicianEmails.map((physician) =>
          this.sendNotificationEmail(
            {
              code: data.code,
              message: data.message,
              caseId: patientCase.externalId || caseId,
              submittedAt: data.submittedAt,
            },
            physician.email,
            physician.name,
            locale,
          ),
        ),
      );

      // 6. Check if all emails were sent successfully
      const failedSends = sendResults.filter((result) => !result.success);
      if (failedSends.length > 0) {
        logger.error(
          { failedSends, caseId },
          "caseContactService: Some notification emails failed to send",
        );
        return ServiceResponse.failure(
          "Failed to send some notifications",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      logger.info(
        { caseId, recipientCount: physicianEmails.length },
        "caseContactService: Contact report sent successfully to all physicians",
      );

      return ServiceResponse.success("Contact report sent successfully", null);
    } catch (error) {
      logger.error({ error }, "caseContactService: Error sending contact report");
      return ServiceResponse.failure(
        "Failed to send contact report",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send notification email to a physician
   */
  private async sendNotificationEmail(
    data: {
      code: string;
      message: string;
      caseId: string;
      submittedAt: Date;
    },
    recipientEmail: string,
    recipientName: string,
    locale: SupportedLocale,
  ): Promise<SendResult> {
    try {
      const transporter = this.getTransporter();

      const { htmlBody, textBody, subject } = emailTemplateService.getTemplate(
        "case-contact-report",
        locale,
        {
          physicianName: recipientName,
          code: data.code,
          caseId: data.caseId,
          message: data.message,
          submittedAt: data.submittedAt.toLocaleString(locale === "de" ? "de-DE" : "en-US"),
        },
      );

      const mailOptions = {
        from: feedbackEnv.SMTP_FROM_EMAIL,
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
      };

      await transporter.sendMail(mailOptions);

      logger.info(
        { recipientEmail, code: data.code },
        "caseContactService: Notification email sent successfully",
      );

      return { success: true };
    } catch (error) {
      logger.error(
        { error, recipientEmail, code: data.code },
        "caseContactService: Failed to send notification email",
      );
      return { success: false, error: String(error) };
    }
  }
}

export const caseContactService = new CaseContactService();
