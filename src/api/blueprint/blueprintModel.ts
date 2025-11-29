import { commonValidations } from "@/common/utils/commonValidation";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Blueprint schema for validation
export const BlueprintSchema = z
  .object({
    _id: zId().optional(),
    __v: z.number().optional(),
    createdOn: z.date(),
    createdBy: zId("User"),
    modifiedOn: z.date().optional(),
    modifiedBy: zId("User").optional(),
    blueprintFor: z.enum(["case", "consultation", "surgery"]),
    title: z.string().min(1, "Title is required"),
    timeDelta: z.string(),
    description: z.string(),
    content: z.object({}).passthrough(), // Flexible JSON object
    tags: z.array(z.string()).default([]),
  })
  .strict();

// Define the schema for creating a Blueprint (without _id, __v, createdOn, modifiedOn)
export const CreateBlueprintSchema = BlueprintSchema.omit({
  _id: true,
  __v: true,
  createdOn: true,
  modifiedOn: true,
  createdBy: true,
  modifiedBy: true,
}).extend({
  createdBy: z.string().optional(), // Will be populated from session
});

// Define the schema for updating a Blueprint
export const UpdateBlueprintSchema = BlueprintSchema.partial()
  .omit({
    _id: true,
    __v: true,
    createdOn: true,
    createdBy: true,
  })
  .extend({
    modifiedBy: z.string().optional(), // Will be populated from session
  });

// Define schemas for route parameters
export const GetBlueprintSchema = z.object({
  params: z.object({
    id: commonValidations.id,
  }),
});

export const DeleteBlueprintSchema = z.object({
  params: z.object({
    id: commonValidations.id,
  }),
});

// Schema for pagination query parameters
export const GetBlueprintsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).default("1"),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("10"),
    blueprintFor: z.enum(["case", "consultation", "surgery"]).optional(),
  }),
});

// Schema for search query parameters
export const SearchBlueprintsQuerySchema = z.object({
  query: z.object({
    q: z.string().min(1, "Search query is required"),
    blueprintFor: z.enum(["case", "consultation", "surgery"]).optional(),
    page: z.string().transform(Number).pipe(z.number().min(1)).default("1"),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("10"),
  }),
});

// Input validation schemas for requests
export const CreateBlueprintRequestSchema = z.object({
  body: CreateBlueprintSchema,
});

export const UpdateBlueprintRequestSchema = z.object({
  params: GetBlueprintSchema.shape.params,
  body: UpdateBlueprintSchema,
});

// Response schemas
export const BlueprintListSchema = z.object({
  blueprints: z.array(BlueprintSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Infer TypeScript type from the schema
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type CreateBlueprint = z.infer<typeof CreateBlueprintSchema>;
export type UpdateBlueprint = z.infer<typeof UpdateBlueprintSchema>;

// Create Mongoose schema from the Blueprint schema
const BlueprintMongooseSchema = zodSchema(BlueprintSchema.omit({ _id: true }));

// Add indexes for search functionality
BlueprintMongooseSchema.index({ title: "text", description: "text", tags: "text" });
BlueprintMongooseSchema.index({ blueprintFor: 1 });
BlueprintMongooseSchema.index({ createdOn: -1 });

export const BlueprintModel = mongoose.model("Blueprint", BlueprintMongooseSchema, "blueprints");
