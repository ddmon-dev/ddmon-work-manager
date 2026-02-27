import { z } from "zod";

export const clientWriteSchema = z.object({
  companyName: z.string().min(1, "회사명을 입력해주세요."),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("올바른 이메일을 입력해주세요.")
    .or(z.literal(""))
    .optional(),
  address: z.string().optional(),
});

export type ClientWriteInput = z.infer<typeof clientWriteSchema>;
