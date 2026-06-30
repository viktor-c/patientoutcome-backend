import { z } from "zod";

export const SubmitFeedbackSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    message: z.string().min(10),
    captchaId: z.string(),
    captchaAnswer: z.string(),
    locale: z.string().optional(),
  }),
});
