import { z } from "zod";

export const projectWriteSchema = z.object({
  clientId: z.string().uuid("유효한 클라이언트 ID가 필요합니다."),
  estimateNumber: z.string().nullable().optional(),
  name: z.string().min(1, "프로젝트명을 입력해주세요."),
  description: z.string().optional(),
  status: z
    .enum(["pending", "active", "settling", "completed", "discarded"])
    .default("pending"),
  workPhase: z
    .enum(["preparing", "working", "reviewing", "delivered"])
    .default("preparing"),
  contractDate: z.string({ required_error: "계약일을 입력해주세요." }), // ISO date string (YYYY-MM-DD)
  completedDate: z.string().nullable().optional(),
  deliveredDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  contractAmount: z.number().positive().nullable().optional(),
  taxType: z.enum(["withholding", "inclusive", "exclusive"]).nullable().optional(),
});

export type ProjectWriteInput = z.infer<typeof projectWriteSchema>;
