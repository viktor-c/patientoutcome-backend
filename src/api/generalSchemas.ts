import { zId } from "@zodyac/zod-mongoose";
import { z } from "zod";

export const NoteSchema = z.object({
  _id: zId().optional(),
  dateCreated: z.string().datetime(),
  createdBy: zId("User"),
  text: z.string(),
});

export const AnaesthesiaSchema = z.object({
  id: z.number(),
  type: z.string(),
});
export const dateSchema = z.coerce.date();
// export const dateSchema = z.string().datetime().transform((str) => new Date(str).toISOString());
// export const dateSchema = z.object({
//   t: z.string().transform((str) => new Date(str).toISOString()),
// })
// export const dateSchema = z.string().transform((str) => new Date(str).toISOString())

export const AnaesthesiaTypeSchema = AnaesthesiaSchema;
