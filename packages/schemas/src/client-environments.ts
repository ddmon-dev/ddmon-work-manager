import { z } from "zod";

// ── 카테고리별 서브 스키마 ────────────────────────────────────

export const hostingSchema = z.object({
  provider: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const domainSchema = z.object({
  registrar: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const ftpSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const customFieldItemSchema = z.object({
  label: z.string().min(1, "항목명을 입력해주세요."),
  value: z.string().min(1, "값을 입력해주세요."),
});

export const customFieldCategorySchema = z.object({
  category: z.string().min(1, "카테고리를 입력해주세요."),
  items: z.array(customFieldItemSchema).min(1, "최소 하나의 항목을 입력해주세요."),
});

// ── 쓰기 스키마 ──────────────────────────────────────────────

export const clientEnvironmentWriteSchema = z.object({
  customerName: z.string().min(1, "고객사명을 입력해주세요."),
  name: z.string().min(1, "사이트/서비스명을 입력해주세요."),
  hosting: hostingSchema.optional(),
  domain: domainSchema.optional(),
  ftp: ftpSchema.optional(),
  customFields: z.array(customFieldCategorySchema).optional(),
  notes: z.string().optional(),
});

export type ClientEnvironmentWriteInput = z.infer<typeof clientEnvironmentWriteSchema>;
export type HostingData = z.infer<typeof hostingSchema>;
export type DomainData = z.infer<typeof domainSchema>;
export type FtpData = z.infer<typeof ftpSchema>;
export type CustomFieldItem = z.infer<typeof customFieldItemSchema>;
export type CustomFieldCategory = z.infer<typeof customFieldCategorySchema>;
export type CustomField = CustomFieldCategory;
