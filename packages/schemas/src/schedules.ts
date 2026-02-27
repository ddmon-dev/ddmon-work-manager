import { z } from "zod";

export const scheduleWriteSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  description: z.string().optional(),
  startDate: z.string({ required_error: "시작일을 입력해주세요." }), // ISO date string (YYYY-MM-DD)
  endDate: z.string().nullable().optional(),
  startTime: z.string().optional(), // HH:mm, 없으면 종일
  endTime: z.string().optional(),
  color: z.string().default("default"),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  location: z.string().optional(),
  recurrenceType: z
    .enum(["none", "daily", "weekly", "monthly"])
    .default("none"),
  recurrenceEndDate: z.string().nullable().optional(),
});

export type ScheduleWriteInput = z.infer<typeof scheduleWriteSchema>;
