import type { Request, RequestHandler, Response } from "express";

import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { userDepartmentService } from "@/api/userDepartment/userDepartmentService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { z } from "zod";

class UserDepartmentController {
  // GET all departments (admin only)
  public getAllDepartments: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await userDepartmentService.findAll();
    return handleServiceResponse(serviceResponse, res);
  };

  // GET department by ID (admin only)
  public getDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userDepartmentService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  // GET user's own department (all authenticated users)
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

    const userDepartmentName = userResponse.responseObject.department;
    
    // Find department by name (we need to add this functionality)
    // For now, we'll get all departments and filter
    const departmentsResponse = await userDepartmentService.findAll();
    if (!departmentsResponse.success || !departmentsResponse.responseObject) {
      return res.status(404).json({ message: "Department not found" });
    }

    const userDepartment = departmentsResponse.responseObject.find(
      (dept: UserDepartment) => dept.name === userDepartmentName
    );

    if (!userDepartment) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Department found",
      responseObject: userDepartment,
    });
  };

  // POST new department (admin only)
  public createUserDepartment: RequestHandler = async (req: Request, res: Response) => {
    const departmentData = req.body;
    const serviceResponse = await userDepartmentService.create(departmentData);
    return handleServiceResponse(serviceResponse, res);
  };

  // PUT update department by ID (admin only)
  public updateDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const departmentData = req.body;
    const serviceResponse = await userDepartmentService.update(id, departmentData);
    return handleServiceResponse(serviceResponse, res);
  };

  // DELETE department by ID (admin only)
  public deleteDepartmentById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await userDepartmentService.delete(id);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const userDepartmentController = new UserDepartmentController();
