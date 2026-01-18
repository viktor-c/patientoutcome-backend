import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import type { UserNoPassword } from "@/api/user/userModel";
import { userService } from "@/api/user/userService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { activityLogService } from "@/common/services/activityLogService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";
import { batchCreateCodesSchema, userRegistrationZod } from "./userRegistrationSchemas";
import { userRegistrationService } from "./userRegistrationService";

/**
 * User Controller
 * @class UserController
 * @description Handles HTTP requests for user management, authentication, authorization, and user registration workflows
 */
class UserController {
  /**
   * Get all users with optional role filtering
   * @route GET /user
   * @access Authenticated users
   * @param {Request} req - Express request with optional role query param, userId and roles in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with filtered user list or 401 if not authenticated
   * @description Retrieves users filtered by role and user's access permissions
   */
  public getUsers: RequestHandler = async (req: Request, res: Response) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required: Not logged in" });
    }

    const { role } = req.query;
    const userId = req.session.userId;
    const userRoles = req.session.roles || [];

    const serviceResponse = await userService.findAllFiltered(userId, userRoles, role as string | undefined);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all kiosk users
   * @route GET /user/kiosk/all
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all kiosk users
   * @description Retrieves all users with kiosk role
   */
  public getAllKioskUsers: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userService.getAllKioskUsers();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get available (unassigned) kiosk users
   * @route GET /user/kiosk/available
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of kiosks without active consultation assignments
   * @description Retrieves kiosk users that are available for consultation assignment
   */
  public getAvailableKioskUsers: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userService.getAvailableKioskUsers();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a user by ID
   * @route GET /user/:id
   * @param {Request} req - Express request with user ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with user details (without password) or 404
   * @description Retrieves a single user by MongoDB ObjectId
   */
  public getUser: RequestHandler = async (req: Request, res: Response) => {
    // const id = Number.parseInt(req.params.id as string, 10);
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  //TODO users should be created using the register code, but in future we could allow this path, for example just for some roles
  // public createUser: RequestHandler = async (req: Request, res: Response) => {
  //   const userData = req.body;
  //   const serviceResponse = await userService.createUser(userData);
  //   return handleServiceResponse(serviceResponse, res);
  // };

  /* Update current logged -in user
    * @route PUT / user
      * @access Authenticated users
        * @param { Request } req - Express request with update data in body, userId in session
          * @param { Response } res - Express response object
            * @returns { Promise<Response> } ServiceResponse with updated user or 401 if not authenticated
              * @description Updates the currently logghttps://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/line.htmled -in user's profile
                */

  public updateUser: RequestHandler = async (req: Request, res: Response) => {
    // Get user id from session (or JWT, adjust as needed)
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ message: "Authentication required: User id not found in session" });
    }

    const userData = req.body;
    // Determine which user is being updated
    // If an id is provided in the request body and it's different from the session user,
    // the user is attempting to update another user (admin operation)
    const targetUserId = userData.id || sessionUserId;

    // If updating another user, remove the id from userData before passing to service
    if (userData.id) {
      delete userData.id;
    }

    const serviceResponse = await userService.updateUser(targetUserId, userData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a user by ID
   * @route PUT /user/:id
   * @access Admin only
   * @param {Request} req - Express request with user ID in params, update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated user
   * @description Allows admins to update any user. Regular users should use PUT /user/update for their own profile.
   */
  public updateUserById: RequestHandler = async (req: Request, res: Response) => {
    // ACL middleware ensures user has admin privileges
    const userId = z.string().parse(req.params.id);
    const userData = req.body;
    const serviceResponse = await userService.updateUser(userId, userData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a user by username
   * @route DELETE /user/:username
   * @param {Request} req - Express request with username in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a user account
   */
  public deleteUser: RequestHandler = async (req: Request, res: Response) => {
    const username = z.string().parse(req.params.username);
    const serviceResponse = await userService.deleteUser(username);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * User login
   * @route POST /user/login
   * @param {Request} req - Express request with username and password in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with session data and user info or authentication error
   * @description Authenticates user credentials and creates session with role-based permissions
   */
  public loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const serviceResponse = await userService.login(username, password);
    if (serviceResponse.statusCode === 200 && serviceResponse.responseObject) {
      if (serviceResponse.responseObject._id === undefined) {
        req.session.userId = undefined;
        // do we need to destroy session?
        await req.session.destroy(() => { });
        // do not allow login
        return handleServiceResponse(ServiceResponse.failure("Invalid user ID", null, StatusCodes.UNAUTHORIZED), res);
      } else {
        req.session.userId = isValidObjectId(serviceResponse.responseObject._id)
          ? serviceResponse.responseObject._id.toString()
          : undefined; // Store userId in the session
      }
      req.session.roles = serviceResponse.responseObject.roles; // Store user roles in the session
      req.session.permissions = serviceResponse.responseObject.permissions; // Store user permissions in the session
      req.session.lastLogin = new Date(); // Store last login time
      req.session.loggedIn = true; // Mark the user as logged in
      req.session.username = username;
      // Store user department ObjectId as array
      req.session.department = serviceResponse.responseObject.department 
        ? [serviceResponse.responseObject.department.toString()] 
        : [];

      // Log the activity
      activityLogService.log({
        username,
        action: "User logged in",
        type: "login",
        details: `Roles: ${serviceResponse.responseObject.roles.join(", ")}`,
      });

      //@ts-ignore-next-line
      serviceResponse.responseObject._id = undefined;
      await req.session.save(); // Save the session
    }
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Switch user role/context
   * @route POST /user/role-switch
   * @param {Request} req - Express request with username in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with new user context or 403/404 on error
   * @description Allows switching between kiosk and doctor roles without re-authentication
   */
  public roleSwitchUser: RequestHandler = async (req: Request, res: Response) => {
    const { username } = req.body;
    const previousUser = req.session?.username || "unknown";

    // Fetch the existing user without creating a new one
    const user = await userService.findByUsername(username);
    if (!user || !user._id) {
      return handleServiceResponse(
        ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND),
        res
      );
    }

    // Only allow role switching for kiosk and doctor roles
    const allowedRoles = ["kiosk", "doctor"];
    const hasAllowedRole = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasAllowedRole) {
      return handleServiceResponse(
        ServiceResponse.failure(
          "Role switching only allowed for kiosk and doctor users",
          null,
          StatusCodes.FORBIDDEN
        ),
        res
      );
    }

    // Update session with the existing user's data (without altering the cookie)
    req.session.userId = isValidObjectId(user._id) ? user._id.toString() : undefined;
    req.session.roles = user.roles;
    req.session.permissions = user.permissions;
    req.session.lastLogin = new Date();
    req.session.loggedIn = true;
    req.session.username = username;
    req.session.consultationId = user.consultationId?.toString();

    // Log the role switch activity
    activityLogService.log({
      username,
      action: "Role switched",
      type: "roleSwitch",
      details: `From: ${previousUser} → To: ${username} (${user.roles.join(", ")})`,
    });

    // Create UserNoPassword response object
    const userWithoutPassword: UserNoPassword = {
      _id: user._id,
      username: user.username,
      name: user.name,
      department: user.department,
      roles: user.roles,
      permissions: user.permissions,
      email: user.email,
      lastLogin: user.lastLogin,
      belongsToCenter: user.belongsToCenter,
      consultationId: user.consultationId,
      postopWeek: user.postopWeek,
    };

    await req.session.save();

    logger.info({ username, previousUser, roles: user.roles }, "🔄 Role switch successful");

    return handleServiceResponse(
      ServiceResponse.success("Role switch successful", userWithoutPassword, StatusCodes.OK),
      res
    );
  };

  /**
   * User logout
   * @route POST /user/logout
   * @access Authenticated users
   * @param {Request} req - Express request with session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming logout or 401 if not logged in
   * @description Destroys user session and clears authentication cookies
   */
  public logoutUser: RequestHandler = async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId) {
      return handleServiceResponse(
        ServiceResponse.failure("Authentication required: Not logged in", null, StatusCodes.UNAUTHORIZED),
        res,
      );
    }
    req.session.destroy((error) => {
      if (error) {
        logger.error({ error }, "Error destroying session");
        return handleServiceResponse(
          ServiceResponse.failure("An error occurred while logging out.", null, StatusCodes.INTERNAL_SERVER_ERROR),
          res,
        );
      }
      res.clearCookie("connect.sid"); // Clear the session cookie
      return handleServiceResponse(ServiceResponse.success("Logout successful", null), res);
    });
  };

  /**
   * Register a new user
   * @route POST /user/register
   * @param {Request} req - Express request with registration data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created user or validation errors
   * @description Handles new user registration with code validation and account creation
   */
  public registerUser: RequestHandler = async (req: Request, res: Response) => {
    const parseResult = userRegistrationZod.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.issues.map((e: any) => e.message).join(", "),
      });
    }
    const serviceResponse = await userRegistrationService.registerUser(parseResult.data);

    // even if we had errors, return them together
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Batch create registration codes
   * @route POST /user/registration-codes/batch
   * @access Admin
   * @param {Request} req - Express request with batch creation parameters in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created codes or validation errors
   * @description Creates multiple registration codes for user onboarding (admin only)
   */
  public batchCreateRegistrationCodes: RequestHandler = async (req: Request, res: Response) => {
    const parseResult = batchCreateCodesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues.map((e: any) => e.message).join(", "),
      });
    }
    const serviceResponse = await userRegistrationService.batchCreateCodes(parseResult.data);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Check username availability
   * @route GET /user/check-username/:username
   * @param {Request} req - Express request with username in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse indicating if username is available
   * @description Validates whether a username is available for registration
   */
  public checkUsernameAvailability: RequestHandler = async (req: Request, res: Response) => {
    const { username } = req.params;
    const serviceResponse = await userRegistrationService.checkUsernameAvailability(username);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Change user password
   * @route POST /user/change-password
   * @access Authenticated users
   * @param {Request} req - Express request with currentPassword, newPassword, confirmPassword in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming password update or 401/400 on errors
   * @description Allows logged-in users to change their password with current password verification
   */
  public changePassword: RequestHandler = async (req, res) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return handleServiceResponse(
        ServiceResponse.failure("Authentication required: Not logged in", null, StatusCodes.UNAUTHORIZED),
        res,
      );
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;
    // Fetch user from DB
    const user = await userService.findByIdWithPassword(userId);
    if (!user || !user.responseObject) {
      return handleServiceResponse(ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND), res);
    }
    // Check current password
    const passwordMatches = await userService.comparePassword(currentPassword, user.responseObject.password);
    if (!passwordMatches) {
      return handleServiceResponse(
        ServiceResponse.failure("Current password is incorrect", null, StatusCodes.BAD_REQUEST),
        res,
      );
    }
    // Check newPassword === confirmPassword
    if (newPassword !== confirmPassword) {
      return handleServiceResponse(
        ServiceResponse.failure("New password and confirm password do not match", null, StatusCodes.BAD_REQUEST),
        res,
      );
    }
    // Update password
    const updateResult = await userService.updatePassword(userId, newPassword);
    return handleServiceResponse(updateResult, res);
  };
}

export const userController = new UserController();
