/*
- neue konsultation angelegt
- zeigt ein button -> Kode aktivieren
- auf dem Tisch liegen mehrere kodes, dies wird von der schwester genommen, der kode wird eingegeben
- der eingegebene kode wird aktiviert am backend
  - jeder kode hat ein link, wenn der link besucht wird, weiss der backend welche consultation zu öffnen ist
  - die infos zur konsultation werden an frontend geschickt
  - frontend zeigt die forms


backend
  - use the file "codeModel.ts". Create codeController.ts, codeRepository.ts, codeRouter.ts, codeService.ts and __tests__/code.test.ts
  - in codeRepository.ts create a public variable named "codeMockData" and add a batch of 20 codes, each code should have 3 letters and 2 numbers,
    - for each code add a 64bit unique uuid
  - create API operations to activate and deactivate an existing code
  - create API operations to add a new code, to delete an existing code
  - create an API operation to get a code based on uuid
  - create an API operation to get a code based on uuid
  - one can access the backend with the combination either of code or directly by link
*/
import { commonValidations } from "@/common/utils/commonValidation";

import { extendZod, zId, zodSchema, zodSchemaRaw } from "@zodyac/zod-mongoose";
import { extend } from "dayjs";
import mongoose from "mongoose";
import { z } from "zod";
import { string } from "zod/v4";
extendZod(z);
// Define the Patient schema
export const CodeSchema = z.object({
  _id: zId().optional(),
  /*
   * this string will be given to the user, he can access data with this code. Using an external code to access data leads to the translation into internal code.
   */
  code: z.string().unique(),
  /*
   * this date will be set when the code is created
   * activatedOn can be reset.
   */
  activatedOn: z.date().optional(),
  /*
   * this date will be set when the code is created
   * expiresOn can be reset.
   */
  expiresOn: z.date().optional(),
  /*
   * this string will be used to access the consultation data
   * */
  consultationId: zId("Consultation").optional(),
});

// Infer TypeScript type from the schema
export type Code = z.infer<typeof CodeSchema>;

/** Create Mongoose Schema and Model */
const MongooseCodeSchema = zodSchema(CodeSchema.omit({ _id: true }));
export const codeModel = mongoose.model("Code", MongooseCodeSchema, "form-access-codes");

// ****************************************************
// Input validation

// Input validation for 'GET code/:code' endpoint
export const GetCodeSchema = z.object({
  params: z.object({ code: z.string() }),
});

// Input validation for 'PUT code/:code/consultation/:consultationId' endpoint
export const ActivateCodeSchema = z.object({
  params: z.object({ code: z.string(), consultationId: commonValidations.id }),
});

// Input validation for 'POST code/:numberOfCodes' endpoint
export const CreateCodeSchema = z.object({
  params: z.object({
    numberOfCodes: z.preprocess(
      Number,
      z.number().min(1, "At least 1 code must be created").max(10, "No more than 10 codes can be created"),
    ),
  }),
  // body: CodeSchema.omit({ _id: true, activatedOn: true, expiresOn: true }),
});

// Input validation for 'DELETE code/:code' endpoint
export const DeleteCodeSchema = z.object({ code: z.string() });

export const ExternalCodeSchema = z.object({ params: z.object({ code: z.string() }) });
