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
