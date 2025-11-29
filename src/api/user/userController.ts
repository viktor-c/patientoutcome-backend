import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import { userService } from "@/api/user/userService";
import { kioskService } from "@/api/user/kioskService";
import type { UserNoPassword } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { activityLogService } from "@/common/services/activityLogService";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";
import { userRegistrationZod } from "./userRegistrationSchemas";
import { userRegistrationService } from "./userRegistrationService";

class UserController {
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

  public getAllKioskUsers: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userService.getAllKioskUsers();
    return handleServiceResponse(serviceResponse, res);
  };

  public getAvailableKioskUsers: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userService.getAvailableKioskUsers();
    return handleServiceResponse(serviceResponse, res);
  };

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

  public updateUser: RequestHandler = async (req: Request, res: Response) => {
    // Get user id from session (or JWT, adjust as needed)
    const id = req.session?.userId;
    if (!id) {
      return res.status(401).json({ message: "Authentication required: User id not found in session" });
    }
    const userData = req.body;
    const serviceResponse = await userService.updateUser(id, userData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteUser: RequestHandler = async (req: Request, res: Response) => {
    const username = z.string().parse(req.params.username);
    const serviceResponse = await userService.deleteUser(username);
    return handleServiceResponse(serviceResponse, res);
  };

  public loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const serviceResponse = await userService.login(username, password);
    if (serviceResponse.statusCode === 200 && serviceResponse.responseObject) {
      if (serviceResponse.responseObject._id === undefined) {
        req.session.userId = undefined;
        // do we need to destroy session?
        await req.session.destroy(() => {});
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

  public kioskLoginUser: RequestHandler = async (req: Request, res: Response) => {
    const { username } = req.body;
    
    const serviceResponse = await kioskService.kioskLogin(username);
    if (serviceResponse.statusCode === 200 && serviceResponse.responseObject) {
      if (serviceResponse.responseObject._id === undefined) {
        req.session.userId = undefined;
        await req.session.destroy(() => {});
        return handleServiceResponse(ServiceResponse.failure("Invalid user ID", null, StatusCodes.UNAUTHORIZED), res);
      } else {
        req.session.userId = isValidObjectId(serviceResponse.responseObject._id)
          ? serviceResponse.responseObject._id.toString()
          : undefined;
      }
      req.session.roles = serviceResponse.responseObject.roles;
      req.session.permissions = serviceResponse.responseObject.permissions;
      req.session.lastLogin = new Date();
      req.session.loggedIn = true;
      req.session.username = username;
      req.session.consultationId = serviceResponse.responseObject.consultationId?.toString();
      
      // Log the kiosk login activity
      activityLogService.log({
        username,
        action: "Kiosk user logged in (passwordless)",
        type: "login",
        details: `Consultation ID: ${req.session.consultationId}`,
      });
      
      //@ts-ignore-next-line
      serviceResponse.responseObject._id = undefined;
      await req.session.save();
    }
    return handleServiceResponse(serviceResponse, res);
  };

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

  public registerUser: RequestHandler = async (req: Request, res: Response) => {
    const parseResult = userRegistrationZod.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }
    const serviceResponse = await userRegistrationService.registerUser(parseResult.data);

    // even if we had errors, return them together
    return handleServiceResponse(serviceResponse, res);
  };

  public changePassword: RequestHandler = async (req, res) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required: Not logged in" });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;
    // Fetch user from DB
    const user = await userService.findByIdWithPassword(userId);
    if (!user || !user.responseObject) {
      return res.status(404).json({ message: "User not found." });
    }
    // Check current password
    const passwordMatches = await userService.comparePassword(currentPassword, user.responseObject.password);
    if (!passwordMatches) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    // Check newPassword === confirmPassword
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match." });
    }
    // Update password
    const updateResult = await userService.updatePassword(userId, newPassword);
    if (updateResult.statusCode === 200) {
      return res.status(200).json({ message: "Password changed successfully." });
    } else {
      return res.status(400).json({ message: updateResult.message || "Error changing password." });
    }
  };
}

export const userController = new UserController();
