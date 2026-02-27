import { z } from "zod";

export const todoWriteSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요."),
  todoDate: z.string({ required_error: "날짜를 입력해주세요." }), // ISO date string (YYYY-MM-DD)
  sortOrder: z.number().int().default(0),
  color: z.string().default("slate"),
});

export type TodoWriteInput = z.infer<typeof todoWriteSchema>;
