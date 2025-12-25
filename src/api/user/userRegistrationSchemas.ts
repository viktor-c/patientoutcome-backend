import { z } from "zod";

export const userRegistrationZod = z.object({
  username: z.string().min(3),
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  registrationCode: z.string().regex(/^[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationZod>;

export const batchCreateCodesSchema = z.object({
  roles: z.array(
    z.object({
      role: z.string().min(1),
      count: z.number().int().min(0).max(100),
    })
  ).min(1),
  department: z.string().min(1),
  belongsToCenter: z.array(z.string()).min(1),
  expiryType: z.enum(['days', 'months', 'years', 'date']),
  expiryValue: z.union([z.number().int().positive(), z.string().datetime()]),
});

export type BatchCreateCodesRequest = z.infer<typeof batchCreateCodesSchema>;

export const checkUsernameSchema = z.object({
  params: z.object({
    username: z.string().min(3),
  }),
});

