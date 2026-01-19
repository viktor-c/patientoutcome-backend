import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { userDepartmentModel } from "@/api/userDepartment/userDepartmentModel";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed } from "@/common/utils/seedingUtils";

/**
 * Repository for UserDepartment operations
 * Connects to the database and retrieves user department data
 */
export class UserDepartmentRepository {
  // Mock departments for development/testing
  private _mockDepartments: UserDepartment[] = [
    {
      _id: "675000000000000000000001",
      name: "Orthopädie und Unfallchirurgie",
      shortName: "UO",
      description: "Orthopedic Department",
      contactEmail: "ortho@example.com",
      contactPhone: "+49 123 456 7890",
      departmentType: "department",
      center: "675000000000000000000003", // Klinikum Fulda
    },
    {
      _id: "675000000000000000000002",
      name: "Radiology",
      shortName: "RAD",
      description: "Radiology Department",
      contactEmail: "radiology@example.com",
      contactPhone: "+49 123 456 7891",
      departmentType: "department",
      center: "675000000000000000000003", // Klinikum Fulda
    },
    {
      _id: "675000000000000000000003",
      name: "Klinikum Fulda",
      shortName: "KliFulda",
      description: "Klinikum Fulda - Main Medical Center",
      contactEmail: "info@klinikum-fulda.de",
      contactPhone: "+49 661 84-0",
      departmentType: "center",
      center: null, // Centers don't have a parent center
    },
    {
      _id: "675000000000000000000004",
      name: "Klinikum Musterstadt",
      shortName: "KliMuSta",
      description: "Universitätsklinikum bei Musterstadt",
      contactEmail: "klimu@example.com",
      contactPhone: "+49 123 456 7891",
      departmentType: "center",
      center: null, // Centers don't have a parent center
    },
    {
      _id: "675000000000000000000005",
      name: "Klinikum Maisfeld",
      shortName: "KliMaisfeld",
      description: "Klinikum Maisfeld",
      contactEmail: "klimaisfeld@example.com",
      contactPhone: "+49 123 456 7892",
      departmentType: "center",
      center: null, // Centers don't have a parent center
    },
  ];

  get mockDepartments(): UserDepartment[] {
    return this._mockDepartments;
  }

  async findAllAsync(): Promise<UserDepartment[]> {
    try {
      const departments = (await userDepartmentModel.find().lean()) as unknown as UserDepartment[];
      return departments;
    } catch (error) {
      logger.error({ error }, "Error finding all departments");
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<UserDepartment | null> {
    try {
      const department = (await userDepartmentModel.findById(id).lean()) as unknown as UserDepartment | null;
      return department;
    } catch (error) {
      logger.error({ error, id }, `Error finding department by id ${id}`);
      return Promise.reject(error);
    }
  }

  async findByNameAsync(name: string): Promise<UserDepartment | null> {
    try {
      const department = (await userDepartmentModel.findOne({ name }).lean()) as unknown as UserDepartment | null;
      return department;
    } catch (error) {
      logger.error({ error, name }, `Error finding department by name ${name}`);
      return Promise.reject(error);
    }
  }

  async createAsync(departmentData: Omit<UserDepartment, "_id">): Promise<UserDepartment> {
    try {
      const department = await userDepartmentModel.create(departmentData);
      return department.toObject() as unknown as UserDepartment;
    } catch (error) {
      logger.error({ error }, "Error creating department");
      return Promise.reject(error);
    }
  }

  async updateAsync(id: string, departmentData: Partial<Omit<UserDepartment, "_id">>): Promise<UserDepartment | null> {
    try {
      const department = (await userDepartmentModel
        .findByIdAndUpdate(id, departmentData, { new: true })
        .lean()) as unknown as UserDepartment | null;
      return department;
    } catch (error) {
      logger.error({ error, id }, `Error updating department ${id}`);
      return Promise.reject(error);
    }
  }

  async deleteAsync(id: string): Promise<boolean> {
    try {
      const result = await userDepartmentModel.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      logger.error({ error, id }, `Error deleting department ${id}`);
      return Promise.reject(error);
    }
  }

  async countChildDepartments(centerId: string): Promise<number> {
    try {
      const count = await userDepartmentModel.countDocuments({ center: centerId });
      return count;
    } catch (error) {
      logger.error({ error, centerId }, `Error counting child departments for center ${centerId}`);
      return Promise.reject(error);
    }
  }

  async seedMockData(): Promise<void> {
    try {
      await assertSeedingAllowed();
      const existingCount = await userDepartmentModel.countDocuments();
      if (existingCount === 0) {
        await userDepartmentModel.insertMany(this._mockDepartments);
        logger.info("Mock departments seeded successfully");
      }
    } catch (error) {
      logger.error({ error }, "Error seeding mock departments");
      return Promise.reject(error);
    }
  }
}

// Export a singleton instance
export const userDepartmentRepository = new UserDepartmentRepository();
