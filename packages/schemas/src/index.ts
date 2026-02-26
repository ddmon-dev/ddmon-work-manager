import { z } from "zod";

export const exampleSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type ExampleInput = z.infer<typeof exampleSchema>;
