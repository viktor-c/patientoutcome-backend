/**
 * @file Permissions Service
 * @module api/permissions
 * @description Service layer for checking user permissions based on roles and settings
 */

import { settingsService } from "@/api/settings/settingsService";
import { userAuthenticationLevels } from "@/common/middleware/aclConfig";
import { logger } from "@/common/utils/logger";

/**
 * Role hierarchy for permission checking
 * Higher numbers = higher permissions
 */
const ROLE_HIERARCHY: Record<string, number> = userAuthenticationLevels;

/**
 * Permissions Service
 * Checks user permissions based on role hierarchy and settings configuration
 */
export class PermissionsService {
  /**
   * Check if a user's role meets the minimum required role
   * @param userRole The user's current role
   * @param minRole The minimum required role
   * @returns True if user's role >= minRole in hierarchy
   */
  private hasRoleLevel(userRole: string, minRole: string): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
    return userLevel >= minLevel;
  }

  /**
   * Check if user can archive/soft-delete forms
   * @param userRole The user's role
   * @returns True if user has permission
   */
  async canArchiveForms(userRole: string): Promise<boolean> {
    try {
      const minRole = (await settingsService.getSettingValue("permissions", "MIN_ROLE_FOR_FORM_ARCHIVE")) as string;
      if (!minRole) {
        // Fallback to default if setting not found
        logger.warn("MIN_ROLE_FOR_FORM_ARCHIVE setting not found, using default: doctor");
        return this.hasRoleLevel(userRole, "doctor");
      }
      return this.hasRoleLevel(userRole, minRole);
    } catch (error) {
      logger.error({ error }, "Error checking form archive permission");
      // Fallback to doctor role on error
      return this.hasRoleLevel(userRole, "doctor");
    }
  }

  /**
   * Check if user can delete consultations
   * @param userRole The user's role
   * @returns True if user has permission
   */
  async canDeleteConsultations(userRole: string): Promise<boolean> {
    try {
      const minRole = (await settingsService.getSettingValue(
        "permissions",
        "MIN_ROLE_FOR_CONSULTATION_DELETE"
      )) as string;
      if (!minRole) {
        logger.warn("MIN_ROLE_FOR_CONSULTATION_DELETE setting not found, using default: study-nurse");
        return this.hasRoleLevel(userRole, "study-nurse");
      }
      return this.hasRoleLevel(userRole, minRole);
    } catch (error) {
      logger.error({ error }, "Error checking consultation delete permission");
      return this.hasRoleLevel(userRole, "study-nurse");
    }
  }

  /**
   * Check if user can delete other users
   * @param userRole The user's role
   * @returns True if user has permission
   */
  async canDeleteUsers(userRole: string): Promise<boolean> {
    try {
      const minRole = (await settingsService.getSettingValue("permissions", "MIN_ROLE_FOR_USER_DELETE")) as string;
      if (!minRole) {
        logger.warn("MIN_ROLE_FOR_USER_DELETE setting not found, using default: admin");
        return this.hasRoleLevel(userRole, "admin");
      }
      return this.hasRoleLevel(userRole, minRole);
    } catch (error) {
      logger.error({ error }, "Error checking user delete permission");
      return this.hasRoleLevel(userRole, "admin");
    }
  }

  /**
   * Get all permissions for a user role
   * @param userRole The user's role
   * @returns Object with all permission flags
   */
  async getUserPermissions(userRole: string): Promise<{
    canArchiveForms: boolean;
    canDeleteConsultations: boolean;
    canDeleteUsers: boolean;
  }> {
    const [canArchiveForms, canDeleteConsultations, canDeleteUsers] = await Promise.all([
      this.canArchiveForms(userRole),
      this.canDeleteConsultations(userRole),
      this.canDeleteUsers(userRole),
    ]);

    return {
      canArchiveForms,
      canDeleteConsultations,
      canDeleteUsers,
    };
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService();
