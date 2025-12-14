import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { z } from "@/common/utils/zodInit";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { zId } from "@zodyac/zod-mongoose";

export const dateSchema = z.coerce.date();
// export const dateSchema = z.string().datetime().transform((str) => new Date(str).toISOString());
// export const dateSchema = z.object({
//   t: z.string().transform((str) => new Date(str).toISOString()),
// })
// export const dateSchema = z.string().transform((str) => new Date(str).toISOString())

export const NoteSchema = z.object({
  _id: zId().optional(),
  dateCreated: dateSchema,
  dateModified: dateSchema.optional(),
  createdBy: zId("User").optional(),
  note: z.string(),
});

// Schema for creating notes - createdBy is optional and will be populated from session
export const CreateNoteSchema = NoteSchema.omit({ createdBy: true }).extend({
  createdBy: z.string().optional(),
});

export const AnaesthesiaSchema = z.object({
  id: z.number().optional(),
  type: z.string().optional(),
});

export const AnaesthesiaTypeSchema = AnaesthesiaSchema;

export const generalSchemaRegistry = new OpenAPIRegistry();
generalSchemaRegistry.register("Note", NoteSchema);
generalSchemaRegistry.register("CreateNote", CreateNoteSchema);
generalSchemaRegistry.register("AnaesthesiaType", AnaesthesiaTypeSchema);
generalSchemaRegistry.register("ValidationErrors", ValidationErrorsSchema);
