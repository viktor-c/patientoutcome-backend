import type { Request, RequestHandler, Response } from "express";

import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { userDepartmentService } from "@/api/userDepartment/userDepartmentService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { z } from "zod";

/**
 * User Department Controller
 * @class UserDepartmentController
 * @description Handles HTTP requests for organizational department/center management
 */
class UserDepartmentController {
  /**
   * Get all departments
   * @route GET /userDepartment
   * @access Admin
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all departments
   * @description Retrieves all organizational departments (admin only)
   */
  public getAllDepartments: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userDepartmentService.findAll();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a department by ID
   * @route GET /userDepartment/:id
   * @access Admin
   * @param {Request} req - Express request with department ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with department details or 404
   * @description Retrieves a single department (admin only)
   */
  public getDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userDepartmentService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get current user's department
   * @route GET /userDepartment/my
   * @access Authenticated users
   * @param {Request} req - Express request with userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with user's department or 401/404
   * @description Retrieves the department of the currently logged-in user
   */
  public getUserDepartment: RequestHandler = async (req: Request, res: Response) => {
    // Get user's department from their session/user data
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required: User id not found in session" });
    }

    // Import userService to get user info
    const { userService } = await import("../user/userService.js");
    const userResponse = await userService.findById(userId);
    
    if (!userResponse.success || !userResponse.responseObject) {
      return res.status(404).json({ message: "User not found" });
    }

    // User's department is stored as an array of ObjectIds, get the first one
    let userDepartmentId = '';
    if (Array.isArray(userResponse.responseObject.department) && userResponse.responseObject.department.length > 0) {
      const dept = userResponse.responseObject.department[0];
      userDepartmentId = dept ? String(dept) : '';
    } else if (userResponse.responseObject.department) {
      userDepartmentId = String(userResponse.responseObject.department);
    }
    
    // Get department by ID directly
    const serviceResponse = await userDepartmentService.getUserDepartment(userDepartmentId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new department
   * @route POST /userDepartment
   * @access Admin
   * @param {Request} req - Express request with department data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created department or validation errors
   * @description Creates a new organizational department (admin only)
   */
  public createUserDepartment: RequestHandler = async (req: Request, res: Response) => {
    const departmentData = req.body;
    const serviceResponse = await userDepartmentService.create(departmentData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a department
   * @route PUT /userDepartment/:id
   * @access Admin
   * @param {Request} req - Express request with department ID in params and update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated department or errors
   * @description Updates an existing department (admin only)
   */
  public updateDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const departmentData = req.body;
    const serviceResponse = await userDepartmentService.update(id, departmentData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update code life setting for a department
   * @route PATCH /userDepartment/:id/code-life
   * @access Doctor+
   * @description Only allows a doctor (or above) to update externalAccessCodeLife
   *   for a department they belong to.
   */
  public updateCodeLifeSetting: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const { externalAccessCodeLife } = req.body as { externalAccessCodeLife: string };

    // Enforce that the requesting user belongs to the target department,
    // unless they are an admin (who can manage any department).
    const userRoles: string[] = req.session?.roles ?? [];
    const isAdmin = userRoles.includes("admin");
    const userDepts = req.session?.department ?? [];
    if (!isAdmin && !userDepts.includes(id)) {
      return res
        .status(403)
        .json({ success: false, message: "You can only update code life settings for your own departments." });
    }

    const serviceResponse = await userDepartmentService.updateCodeLifeSetting(id, externalAccessCodeLife);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a department
   * @route DELETE /userDepartment/:id
   * @access Admin
   * @param {Request} req - Express request with department ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a department (admin only)
   */
  public deleteDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userDepartmentService.delete(id);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const userDepartmentController = new UserDepartmentController();
