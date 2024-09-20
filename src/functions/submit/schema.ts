import { z } from "zod";

export const submitSchema = z.object({
  name: z.string(),
  adults: z.coerce.number().int(),
  children: z.coerce.number().int(),
  email: z.string().email(),
  "anything-else": z.string(),
});
export type SubmitSchema = z.infer<typeof submitSchema>;
