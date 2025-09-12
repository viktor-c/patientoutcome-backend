import { CreateNoteSchema, type NoteSchema, dateSchema } from "@/api/generalSchemas";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import { BlueprintModel } from "./blueprintModel";
import type { Blueprint, CreateBlueprint, UpdateBlueprint } from "./blueprintModel";

export interface SearchOptions {
  q?: string;
  blueprintFor?: "case" | "consultation" | "surgery";
  page?: number;
  limit?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  blueprintFor?: "case" | "consultation" | "surgery";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BlueprintRepository {
  async findAllAsync(options: PaginationOptions = {}): Promise<PaginatedResult<Blueprint>> {
    try {
      const { page = 1, limit = 10, blueprintFor } = options;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (blueprintFor) {
        filter.blueprintFor = blueprintFor;
      }

      const [blueprints, total] = await Promise.all([
        BlueprintModel.find(filter)
          .populate("createdBy", "username name")
          .populate("modifiedBy", "username name")
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        BlueprintModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: blueprints,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error }, "Error finding blueprints");
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<Blueprint | null> {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid ObjectId");
      }

      const blueprint = await BlueprintModel.findById(id)
        .populate("createdBy", "username name")
        .populate("modifiedBy", "username name")
        .lean();

      return blueprint;
    } catch (error) {
      logger.error({ error, id }, "Error finding blueprint by ID");
      return Promise.reject(error);
    }
  }

  async searchAsync(options: SearchOptions): Promise<PaginatedResult<Blueprint>> {
    try {
      const { q, blueprintFor, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // Build search filter
      const filter: any = {};

      if (blueprintFor) {
        filter.blueprintFor = blueprintFor;
      }

      if (q) {
        // Use text search if available, otherwise use regex search
        filter.$or = [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $in: [new RegExp(q, "i")] } },
        ];
      }

      const [blueprints, total] = await Promise.all([
        BlueprintModel.find(filter)
          .populate("createdBy", "username name")
          .populate("modifiedBy", "username name")
          .sort({ createdOn: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        BlueprintModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: blueprints,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error, options }, "Error searching blueprints");
      return Promise.reject(error);
    }
  }

  async createAsync(blueprintData: CreateBlueprint & { createdBy: string }): Promise<Blueprint> {
    try {
      const newBlueprint = new BlueprintModel({
        ...blueprintData,
        createdOn: new Date(),
      });

      await newBlueprint.save();

      const populatedBlueprint = await BlueprintModel.findById(newBlueprint._id)
        .populate("createdBy", "username name")
        .lean();

      return populatedBlueprint!;
    } catch (error) {
      logger.error({ error, blueprintData }, "Error creating blueprint");
      return Promise.reject(error);
    }
  }

  async updateByIdAsync(
    id: string,
    blueprintData: UpdateBlueprint & { modifiedBy?: string },
  ): Promise<Blueprint | null> {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid ObjectId");
      }

      const updateData = {
        ...blueprintData,
        modifiedOn: new Date(),
      };

      const updatedBlueprint = await BlueprintModel.findByIdAndUpdate(id, updateData, { new: true })
        .populate("createdBy", "username name")
        .populate("modifiedBy", "username name")
        .lean();

      return updatedBlueprint;
    } catch (error) {
      logger.error({ error, id, blueprintData }, "Error updating blueprint");
      return Promise.reject(error);
    }
  }

  async deleteByIdAsync(id: string): Promise<Blueprint | null> {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid ObjectId");
      }

      const deletedBlueprint = await BlueprintModel.findByIdAndDelete(id).lean();
      return deletedBlueprint;
    } catch (error) {
      logger.error({ error, id }, "Error deleting blueprint");
      return Promise.reject(error);
    }
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

    try {
      // Clear existing blueprints
      await BlueprintModel.deleteMany({});

      // Insert mock data
      const result = await BlueprintModel.insertMany(this.mockBlueprints);
      logger.info(`Created ${result.length} mock blueprints`);
    } catch (error) {
      logger.error({ error }, "Error creating blueprint mock data");
      return Promise.reject(error);
    }
  }

  // Mock blueprints data with examples for case, consultation, and surgery
  private _mockBlueprints: Partial<Blueprint>[] = [
    {
      _id: "68c08903290365a33d085fca",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock admin user ID
      blueprintFor: "case",
      title: "Standard Orthopedic Case Template",
      description: "A comprehensive template for orthopedic patient cases following the PatientCase schema structure.",
      content: {
        patient_case_structure: {
          externalId: "Optional external identifier for the case",
          patient: "ObjectId reference to Patient document",
          mainDiagnosis: "Array of primary diagnosis strings",
          studyDiagnosis: "Array of study-specific diagnosis strings",
          mainDiagnosisICD10: "Array of ICD-10 codes for main diagnoses",
          studyDiagnosisICD10: "Array of ICD-10 codes for study diagnoses",
          otherDiagnosis: "Array of additional diagnosis strings",
          otherDiagnosisICD10: "Array of ICD-10 codes for other diagnoses",
        },
        surgeries_array: {
          description: "Array of surgery objects with the following structure",
          surgery_fields: {
            externalId: "Optional external surgery identifier",
            diagnosis: "Array of diagnosis strings for this surgery",
            diagnosisICD10: "Array of ICD-10 codes for surgery diagnoses",
            therapy: "String describing the therapeutic intervention",
            OPSCodes: "Array of OPS (operation and procedure) codes",
            side: "Enum: 'left', 'right', or 'none'",
            surgeryDate: "Date of the surgical procedure",
            surgeryTime: "Duration of surgery in minutes (number)",
            tourniqet: "Tourniquet time in minutes (number)",
            anaesthesiaType: "Anesthesia type object with id and type fields",
            roentgenDosis: "Radiation dose in appropriate units (number)",
            roentgenTime: "Duration of X-ray exposure as string",
            additionalData: "Array of note objects with dateCreated, createdBy, note",
            surgeons: "Array of User ObjectId references",
          },
        },
        case_management: {
          supervisors: "Array of User ObjectId references for case supervisors",
          notes: "Array of note objects with dateCreated, createdBy, note fields",
          medicalHistory: "String containing patient's medical history",
          consultations: "Array of Consultation ObjectId references",
          consultationTemplate: "Array of ConsultationTemplate ObjectId references",
        },
        timestamps: {
          createdAt: "Automatic creation timestamp",
          updatedAt: "Automatic update timestamp",
        },
      },
      tags: ["case", "patient-care", "orthopedics", "template"],
    },
    {
      _id: "68c08903290365a33d085fcb",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation",
      title: "MICA 6 Wochen",
      description: "Template for 6-week post-op consultation after MICA procedure",
      timeDelta: "+6 W",
      content: {
        consultation_structure: {
          patientCaseId: "", // id of the parent patient case
          dateAndTime: "", //Date object for consultation scheduling
          reasonForConsultation: "", //Array of enums: ['planned', 'unplanned', 'emergency', 'pain', 'followup']
          notes: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
          visitedBy: [] as Array<string>, //Array of User ObjectId references for clinicians involved
          formAccessCode: "" as string | undefined, //Optional FormAccessCode ObjectId reference
          kioskId: "" as string | undefined, //Optional User ObjectId reference for kiosk assignments
          proms: [] as Array<string>, //Array of Form ObjectId references for associated PROMs
        },
      },
      tags: ["consultation", "clinical", "documentation", "patient-care"],
    },
    {
      _id: "68c08903290365a33d085fcc",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "surgery",
      title: "MICA Surgery template",
      description: "Blaupause für MICA Operation",
      timeDelta: "0",
      content: {
        surgery_identification: {
          _id: "ObjectId for the surgery document",
          externalId: "Optional external identifier for the surgery",
        },
        diagnosis_information: {
          diagnosis: "Array of diagnosis strings specific to this surgery",
          diagnosisICD10: "Array of ICD-10 codes corresponding to the diagnoses",
          therapy: "String describing the therapeutic intervention or procedure name",
        },
        procedure_coding: {
          OPSCodes: "Array of OPS (Operation and Procedure) codes for billing/documentation",
        },
        surgical_details: {
          side: "Enum value: 'left', 'right', or 'none' for bilateral/non-lateralized procedures",
          surgeryDate: "Date object for when the surgery was performed",
          surgeryTime: "Number representing duration of surgery in minutes",
          tourniqet: "Number representing tourniquet time in minutes (if applicable)",
        },
        anesthesia_management: {
          anaesthesiaType: {
            description: "Object containing anesthesia details",
            structure: {
              id: "Numeric identifier for anesthesia type",
              type: "String enum: 'block', 'spinal', 'general anaesthesia', 'local'",
              description: "Human-readable description of anesthesia method",
            },
          },
        },
        radiation_safety: {
          roentgenDosis: "Number representing radiation dose in appropriate units",
          roentgenTime: "String representing duration of X-ray/fluoroscopy exposure (HH:MM:SS format)",
        },
        surgical_team: {
          surgeons: "Array of User ObjectId references for performing surgeons",
        },
        additional_documentation: {
          additionalData: {
            description: "Array of note objects for surgical documentation",
            structure: {
              dateCreated: "Date of note creation",
              createdBy: "User ObjectId reference of note author",
              note: "String containing surgical notes, complications, observations",
            },
          },
        },
        integration_notes: {
          parent_case: "This surgery object is part of the surgeries array in a PatientCase document",
          populated_fields:
            "In API responses, surgeons field gets populated with User documents (SurgeryWithUsersSchema)",
        },
      },
      tags: ["surgery", "procedure", "documentation", "medical-coding"],
    },
    {
      _id: "68c08903290365a33d085fcd",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "case",
      title: "Hallux Valgus Patient Case Template",
      description:
        "Specific template for hallux valgus patient cases following PatientCase schema with orthopedic-specific content.",
      content: {
        case_identification: {
          externalId: "Optional external case identifier (e.g., HV-2024-001)",
          patient: "ObjectId reference to Patient document",
        },
        diagnosis_structure: {
          mainDiagnosis: "Array of primary diagnoses: ['Hallux valgus']",
          studyDiagnosis: "Array of study-specific diagnoses for research",
          mainDiagnosisICD10: "Array of ICD-10 codes: ['M20.1']",
          studyDiagnosisICD10: "Array of study-specific ICD-10 codes",
          otherDiagnosis: "Array of secondary diagnoses (e.g., metatarsalgia)",
          otherDiagnosisICD10: "Array of secondary ICD-10 codes",
        },
        surgical_intervention: {
          description: "Surgeries array containing hallux valgus correction details",
          typical_surgery: {
            diagnosis: "['Hallux valgus deformity']",
            diagnosisICD10: "['M20.1']",
            therapy: "Chevron osteotomy with bunionectomy",
            OPSCodes: "['5-788.5a'] - Osteotomy and correction of foot bones",
            side: "Enum: 'left' or 'right'",
            anaesthesiaType: {
              common_options: [
                "{ id: 1, type: 'block', description: 'Regional nerve block' }",
                "{ id: 2, type: 'spinal', description: 'Spinal anesthesia' }",
                "{ id: 4, type: 'local', description: 'Local anesthesia' }",
              ],
            },
            roentgenDosis: "Radiation dose from intraoperative imaging",
            roentgenTime: "Duration of fluoroscopy (format: HH:MM:SS)",
            surgeons: "Array of surgeon User ObjectIds",
          },
        },
        case_management: {
          supervisors: "Array of supervising physician User ObjectIds",
          medicalHistory: "Patient's relevant medical history including prior foot problems",
          notes: "Array of clinical notes with dateCreated, createdBy, note fields",
          consultations: "Array of Consultation ObjectIds for follow-up visits",
        },
        clinical_workflow: {
          preoperative_assessment: "Document foot deformity, pain levels, functional limitations",
          postoperative_care: "Weight-bearing restrictions, wound care, rehabilitation protocol",
          follow_up_schedule: "2 weeks, 6 weeks, 3 months, 1 year intervals",
        },
      },
      tags: ["case", "hallux-valgus", "orthopedic", "foot-surgery"],
    },
    {
      _id: "68c08903290365a33d085fce",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation" as const,
      title: "Comprehensive Consultation Workflow Template",
      description:
        "Enhanced consultation template based on actual Consultation schema with complete field coverage and workflow guidance",
      content: {
        core_consultation_fields: {
          patientCaseId: "ObjectId reference linking to the patient's case",
          dateAndTime: "Date object for consultation scheduling",
          reasonForConsultation: {
            description: "Array of enum values defining consultation purpose",
            allowed_values: ["planned", "unplanned", "emergency", "pain", "followup"],
            usage_examples: {
              planned: "Scheduled follow-up appointments",
              unplanned: "Walk-in or same-day consultations",
              emergency: "Urgent medical situations",
              pain: "Pain management consultations",
              followup: "Post-procedure monitoring visits",
            },
          },
          visitedBy: "Array of User ObjectId references for attending healthcare providers",
        },
        optional_consultation_fields: {
          formAccessCode: "Optional ObjectId for patient form access",
          kioskId: "Optional User ObjectId for kiosk-based consultations",
        },
        documentation_components: {
          notes: {
            description: "Array of clinical note objects",
            schema: {
              dateCreated: "Date - automatic timestamp",
              createdBy: "ObjectId - User reference for note author",
              note: "String - clinical observation text",
            },
            best_practices: [
              "Document objective findings",
              "Include patient complaints and symptoms",
              "Record treatment decisions and rationale",
              "Note any changes in condition",
            ],
          },
          images: {
            description: "Array of clinical image objects",
            schema: {
              path: "String - file system path to image",
              format: "String - image format (jpg, png, dicom, etc.)",
              dateAdded: "Date - when image was captured/uploaded",
              addedBy: "ObjectId - User who added the image",
              notes: "Array - image-specific note objects",
            },
            requirements: [
              "Obtain patient consent for clinical photography",
              "Follow institutional imaging protocols",
              "Ensure HIPAA compliance for image storage",
            ],
          },
          proms: {
            description: "Patient Reported Outcome Measures",
            field_type: "Array of Form ObjectId references",
            purpose: "Link consultation to completed outcome assessment forms",
          },
        },
        workflow_integration: {
          consultation_creation: "Use CreateConsultationSchema for new consultations",
          consultation_updates: "Use UpdateConsultationSchema for modifications",
          form_integration: "Utilize formTemplates field during creation to assign PROM forms",
          population: "API responses populate visitedBy and proms fields with full documents",
        },
      },
      tags: ["consultation", "workflow", "documentation", "clinical-care", "schema-based"],
    },
  ];

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockBlueprints(): Partial<Blueprint>[] {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockBlueprints;
  }
}

export const blueprintRepository = new BlueprintRepository();
