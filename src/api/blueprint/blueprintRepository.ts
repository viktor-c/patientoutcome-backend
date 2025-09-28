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
  blueprints: T[];
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
        blueprints: blueprints,
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
        blueprints: blueprints,
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
      title: "Blaupause für MICA Patientenfall",
      description: "Gerüst um einen Patientenfall mit MICA Operation zu erstellen",
      timeDelta: "x",
      content: {
        externalId: "",
        patient: "",
        mainDiagnosis: ["Hallux valgus bei Spreizfuß", "Metatarsus primus varus"],
        studyDiagnosis: ["Hallux valgus"],
        mainDiagnosisICD10: ["M20.1", "Q66.8"],
        studyDiagnosisICD10: ["M20.1"],
        otherDiagnosis: ["Schlafapnoe", "Hypertonie"],
        otherDiagnosisICD10: ["G47.3", "I10"],
        // this field holds id to surgery blueprints
        surgeries: ["68c08903290365a33d085fcc"],
        supervisors: "Array of User ObjectId references for case supervisors",
        notes: [],
        medicalHistory: "String containing patient's medical history",
        // array of ids for consultation blueprints
        consultations: ["68c08903290365a33d085fcb", "68c08903290365a33d085fcf"],
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
      timeDelta: "+6W",
      content: {
        patientCaseId: "", // id of the parent patient case
        dateAndTime: "+6W", //Date object for consultation scheduling
        reasonForConsultation: ["planned"], //Array of enums: ['planned', 'unplanned', 'emergency', 'pain', 'followup']
        notes: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
        visitedBy: [] as Array<string>, //Array of User ObjectId references for clinicians involved
        formAccessCode: "" as string | undefined, //Optional FormAccessCode ObjectId reference
        kioskId: "" as string | undefined, //Optional User ObjectId reference for kiosk assignments
        formTemplates: ["67b4e612d0feb4ad99ae2e83", "67b4e612d0feb4ad99ae2e84", "67b4e612d0feb4ad99ae2e85"], //Array of FormTemplate ObjectId references - forms will be created from these templates
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
        externalId: "",
        diagnosis: ["Hallux valgus", "Hammerzehen"],
        diagnosisICD10: ["M20.1", "M20.7"],
        therapy: "String describing the therapeutic intervention or procedure name",
        OPSCodes: ["5-788.5a", "5-789.0"], //Array of OPS codes relevant to the surgery
        side: [],
        surgeryDate: "",
        surgeryTime: 30,
        tourniquet: 0,
        anaesthesiaType: [
          { id: 1, type: "block" },
          { id: 3, type: "general anaesthesia" },
        ],
        roentgenDosis: "2",
        roentgenTime: "00:01:00",
        surgeons: [] as Array<string>, //Array of User ObjectId references for surgeons
        additionalData: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
        patientCase: "", //User ObjectId reference for the associated patient case
        // array of ids for consultation blueprints that should be selected by default when using this surgery blueprint
        consultations: [
          "68c08903290365a33d085fcb",
          "68c08903290365a33d085fcf",
          // "68c08903290365a33d085fd0",
          // "68c08903290365a33d085fd1",
        ],
      },
      tags: ["surgery", "procedure", "documentation", "medical-coding"],
    },
    {
      _id: "68c08903290365a33d085fce",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation" as const,
      title: "Comprehensive Consultation Workflow Template",
      timeDelta: "+6 W",
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
    {
      _id: "68c08903290365a33d085fcf",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation",
      title: "MICA 12 Wochen",
      description: "Template for 12-week post-op consultation after MICA procedure",
      timeDelta: "+12W",
      content: {
        patientCaseId: "", // id of the parent patient case
        dateAndTime: "+12W", //Date object for consultation scheduling
        reasonForConsultation: ["planned"], //Array of enums: ['planned', 'unplanned', 'emergency', 'pain', 'followup']
        notes: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
        visitedBy: [] as Array<string>, //Array of User ObjectId references for clinicians involved
        formAccessCode: "" as string | undefined, //Optional FormAccessCode ObjectId reference
        kioskId: "" as string | undefined, //Optional User ObjectId reference for kiosk assignments
        formTemplates: ["67b4e612d0feb4ad99ae2e83", "67b4e612d0feb4ad99ae2e84"], //Array of FormTemplate ObjectId references - forms will be created from these templates
      },
      tags: ["consultation", "clinical", "documentation", "patient-care"],
    },
    {
      _id: "68c08903290365a33d085fd0",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation",
      title: "MICA 6 Monate postop",
      description: "Template for 6-month post-op consultation after MICA procedure",
      timeDelta: "+6M",
      content: {
        patientCaseId: "", // id of the parent patient case
        dateAndTime: "+6M", //Date object for consultation scheduling
        reasonForConsultation: ["planned"], //Array of enums: ['planned', 'unplanned', 'emergency', 'pain', 'followup']
        notes: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
        visitedBy: [] as Array<string>, //Array of User ObjectId references for clinicians involved
        formAccessCode: "" as string | undefined, //Optional FormAccessCode ObjectId reference
        kioskId: "" as string | undefined, //Optional User ObjectId reference for kiosk assignments
        formTemplates: ["67b4e612d0feb4ad99ae2e83", "67b4e612d0feb4ad99ae2e84"], //Array of FormTemplate ObjectId references - forms will be created from these templates
      },
      tags: ["consultation", "clinical", "documentation", "patient-care"],
    },
    {
      _id: "68c08903290365a33d085fd1",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "consultation",
      title: "MICA 1 Jahr postop",
      description: "Template for 1-year post-op consultation after MICA procedure",
      timeDelta: "+12M",
      content: {
        patientCaseId: "", // id of the parent patient case
        dateAndTime: "+12M", //Date object for consultation scheduling
        reasonForConsultation: ["planned"], //Array of enums: ['planned', 'unplanned', 'emergency', 'pain', 'followup']
        notes: [] as Array<typeof NoteSchema>, //Array of note objects with dateCreated, createdBy, note
        visitedBy: [] as Array<string>, //Array of User ObjectId references for clinicians involved
        formAccessCode: "" as string | undefined, //Optional FormAccessCode ObjectId reference
        kioskId: "" as string | undefined, //Optional User ObjectId reference for kiosk assignments
        formTemplates: ["67b4e612d0feb4ad99ae2e83", "67b4e612d0feb4ad99ae2e84"], //Array of FormTemplate ObjectId references - forms will be created from these templates
      },
      tags: ["consultation", "clinical", "documentation", "patient-care"],
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

/**
 *     {
      _id: "68c08903290365a33d085fcd",
      createdOn: faker.date.past({ years: 1 }), // Random date within the past year
      createdBy: "676336bea497301f6eff8c8f", // Mock doctor user ID
      blueprintFor: "case",
      title: "BAD Hallux Valgus Patient Case Template",
      description:
        "Specific template for hallux valgus patient cases following PatientCase schema with orthopedic-specific content.",
      timeDelta: "+6 W",
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
 */
