import { z } from "zod";

export const submitSchema = z
  .object({
    name: z.string(),
    adults: z.coerce.number().int(),
    children: z.coerce.number().int(),
    email: z.string().email(),
    anythingElse: z.string(),
    bellTent: z.preprocess((val) => val === "on", z.boolean()).default(false),
    davidMascot: z
      .preprocess((val) => val === "on", z.boolean())
      .default(false),
  })
  .transform((data) => ({
    ...data,
    submittedAt: new Date().toISOString(),
  }));
export type SubmitSchema = z.infer<typeof submitSchema>;

export type GSheetFormSchema = SubmitSchema & {
  paid: string;
};
