import { z } from "zod";

export const memoWriteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요."),
});

export type MemoWriteInput = z.infer<typeof memoWriteSchema>;
