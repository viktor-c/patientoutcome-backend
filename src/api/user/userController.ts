import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import { userService } from "@/api/user/userService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { userRegistrationZod } from "./userRegistrationSchemas";
import { userRegistrationService } from "./userRegistrationService";

class UserController {
  public getUsers: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userService.findAll();
    return handleServiceResponse(serviceResponse, res);
  };

  public getUser: RequestHandler = async (req: Request, res: Response) => {
    // const id = Number.parseInt(req.params.id as string, 10);
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public createUser: RequestHandler = async (req: Request, res: Response) => {
    const userData = req.body;
    const serviceResponse = await userService.createUser(userData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateUser: RequestHandler = async (req: Request, res: Response) => {
    // Get user id from session (or JWT, adjust as needed)
    const id = req.session?.userId;
    if (!id) {
      return res.status(401).json({ message: "Unauthorized: user id not found in session." });
    }
    const userData = req.body;
    const serviceResponse = await userService.updateUser(id, userData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteUser: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userService.deleteUser(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public loginUser: RequestHandler = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const serviceResponse = await userService.login(username, password);
    if (
      serviceResponse.statusCode === 200 &&
      serviceResponse.responseObject //&&
      // serviceResponse.responseObject.sessionId
    ) {
      // Fetch userId by username and store in session
      //TODO findByUsername is probably not needed, because we already have userId in serviceResponse
      // const user = await userService.findByUsername(username);
      // if (user && user._id) {
      // }
      req.session.userId = serviceResponse.responseObject.userId; // Store userId in the session
      req.session.role = "admin";
      req.session.lastLogin = new Date(); // Store last login time
      req.session.loggedIn = true; // Mark the user as logged in
      req.session.username = username;
      // req.session.sessionId = serviceResponse.responseObject.sessionId;

      const result = await req.session.save(); // Save the session
      console.debug("Session saved:", result);
    }
    return handleServiceResponse(serviceResponse, res);
  };

  public logoutUser: RequestHandler = async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    const serviceResponse = await userService.logout(sessionId);
    return handleServiceResponse(serviceResponse, res);
  };

  public registerUser: RequestHandler = async (req: Request, res: Response) => {
    const parseResult = userRegistrationZod.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }
    const serviceResponse = await userRegistrationService.registerUser(parseResult.data);
    return handleServiceResponse(serviceResponse, res);
  };

  public changePassword: RequestHandler = async (req, res) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Unauthorized: Not logged in." });
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
