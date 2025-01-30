import { z } from "zod";

export const commonValidations = {
  id: z
    .string()
    .refine((data) => data.length === 24, "An error occured on validation: ID must be 24 characters long")
    .refine(
      (data) => /^[0-9a-fA-F]+$/.test(data),
      "An error occured on validation: ID must contain only hex characters",
    ),
};
