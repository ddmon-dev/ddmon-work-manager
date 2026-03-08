import { z } from "zod";

export const TASK_CATEGORIES = ["planning", "design", "development", "revision", "delivery"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const projectScheduleWriteSchema = z.object({
  projectId: z.string().uuid(),
  category: z.enum(TASK_CATEGORIES).default("development"),
  title: z.string().min(1, "제목을 입력해주세요."),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type ProjectScheduleWriteInput = z.infer<typeof projectScheduleWriteSchema>;

export const projectScheduleSplitSchema = z.object({
  splitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
});

export type ProjectScheduleSplitInput = z.infer<typeof projectScheduleSplitSchema>;
