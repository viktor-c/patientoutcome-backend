import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Kiosk schema for validation
export const KioskSchema = z.object({
  _id: zId().optional(),
  __v: z.number().optional(),
  consultationId: zId("Consultation"),
  kioskUserId: zId("User"),
});

// Define the schema for creating a Kiosk (without _id and __v)
export const CreateKioskSchema = KioskSchema.omit({ _id: true, __v: true });

// Define the schema for updating a Kiosk
export const UpdateKioskSchema = KioskSchema.partial().omit({ _id: true, __v: true });

// Define schemas for route parameters
export const GetKioskSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
  }),
});

export const DeleteKioskSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
  }),
});

export const UpdateConsultationStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
    notes: z.string().optional(),
  }),
});

export const SetConsultationSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
    consultationId: zId("Consultation"),
  }),
});

// Define TypeScript interfaces
export type Kiosk = z.infer<typeof KioskSchema>;
export type CreateKiosk = z.infer<typeof CreateKioskSchema>;
export type UpdateKiosk = z.infer<typeof UpdateKioskSchema>;

// Create the Mongoose schema
const KioskMongooseSchema = zodSchema(KioskSchema.omit({ _id: true }));

// Create and export the Mongoose model
export const kioskModel = mongoose.model<Kiosk>("Kiosk", KioskMongooseSchema, "kiosks");
