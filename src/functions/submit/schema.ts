import { z } from "zod";
import submit from ".";

export const submitSchema = z
  .object({
    name: z.string(),
    adults: z.coerce.number().int(),
    children: z.coerce.number().int(),
    email: z.string().email(),
    "anything-else": z.string(),
  })
  .transform((data) => {
    const { "anything-else": anythingElse, ...rest } = data;

    return {
      ...rest,
      anythingElse: data["anything-else"],
      submittedAt: new Date().toISOString(),
    };
  });
export type SubmitSchema = z.infer<typeof submitSchema>;

export type GSheetFormSchema = SubmitSchema & {
  paid: string;
};
