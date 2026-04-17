import { z } from "zod";

export const estimateItemWriteSchema = z.object({
  name: z.string().min(1, "항목명을 입력해주세요."),
  quantity: z.number().min(0),
  unit: z.string().default(""),
  amount: z.number().min(0),
  sortOrder: z.number().int(),
});

export const estimateGroupWriteSchema = z.object({
  name: z.string().min(1, "그룹명을 입력해주세요."),
  sortOrder: z.number().int(),
  items: z
    .array(estimateItemWriteSchema)
    .min(1, "최소 1개의 항목이 필요합니다."),
});

export const estimateWriteSchema = z.object({
  clientId: z.string().uuid("유효한 클라이언트 ID가 필요합니다."),
  billingClientId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "제목을 입력해주세요."),
  description: z.string().optional(),
  versionLabel: z.string().optional(),
  issuedDate: z.string().nullable().optional(), // ISO date string (YYYY-MM-DD)
  validUntil: z.string().nullable().optional(), // ISO date string (YYYY-MM-DD)
  taxType: z.enum(["withholding", "vat"]).default("vat"),
  discountType: z.enum(["none", "amount", "percentage"]).default("none"),
  discountValue: z.number().min(0).default(0),
  showTaxAmount: z.boolean().default(true),
  notes: z.string().optional(),
  memo: z.string().optional(),
  groups: z
    .array(estimateGroupWriteSchema)
    .min(1, "최소 1개의 그룹이 필요합니다."),
});

export type EstimateWriteInput = z.infer<typeof estimateWriteSchema>;
export type EstimateGroupWriteInput = z.infer<typeof estimateGroupWriteSchema>;
export type EstimateItemWriteInput = z.infer<typeof estimateItemWriteSchema>;
