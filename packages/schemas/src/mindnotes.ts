import { z } from "zod";

export const mindnoteWriteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요."),
});

export type MindnoteWriteInput = z.infer<typeof mindnoteWriteSchema>;
