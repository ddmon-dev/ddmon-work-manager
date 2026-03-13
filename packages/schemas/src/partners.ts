import { z } from "zod";

export const partnerWriteSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phone: z.string().optional(),
  email: z
    .string()
    .email("올바른 이메일을 입력해주세요.")
    .or(z.literal(""))
    .optional(),
  address: z.string().optional(),
  residentNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  accountHolder: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type PartnerWriteInput = z.infer<typeof partnerWriteSchema>;

export const projectPartnerWriteSchema = z.object({
  partnerId: z.string().uuid(),
  roles: z.array(z.string()).optional(),
  amount: z.number().positive().nullable().optional(),
  taxType: z.enum(["withholding", "vat"]).default("withholding"),
  notes: z.string().optional(),
});

export type ProjectPartnerWriteInput = z.infer<typeof projectPartnerWriteSchema>;
