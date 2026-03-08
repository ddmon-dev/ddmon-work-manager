import { z } from "zod";

export const TASK_CATEGORIES = ["planning", "design", "development", "revision", "delivery"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const projectScheduleWriteSchema = z.object({
  projectId: z.string().uuid(),
  laneId: z.string().uuid(),
  category: z.string().default("development"),
  categoryColor: z.string().nullable().optional(),
  title: z.string().min(1, "제목을 입력해주세요."),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type ProjectScheduleWriteInput = z.infer<typeof projectScheduleWriteSchema>;

export const projectScheduleLaneWriteSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().default(""),
  sortOrder: z.number().int().optional(),
});

export type ProjectScheduleLaneWriteInput = z.infer<typeof projectScheduleLaneWriteSchema>;
