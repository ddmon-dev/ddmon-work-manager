// ── 세금 ──────────────────────────────────────────────────────

export const TAX_TYPE = {
  WITHHOLDING: 'withholding',
  VAT: 'vat',
} as const;

export type TaxType = (typeof TAX_TYPE)[keyof typeof TAX_TYPE];

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  withholding: '원천징수(3.3%)',
  vat: '부가세(10%)',
} as const;

// ── 수금 종류 ──────────────────────────────────────────────────────

export const PAYMENT_TYPE = {
  DEPOSIT: "deposit",
  INTERIM: "interim",
  BALANCE: "balance",
  ADDITIONAL: "additional",
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  deposit: "계약금",
  interim: "중도금",
  balance: "잔금",
  additional: "추가금",
} as const;

// ── 할인 ──────────────────────────────────────────────────────

export const DISCOUNT_TYPE = {
  NONE: 'none',
  AMOUNT: 'amount',
  PERCENTAGE: 'percentage',
} as const;

export type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE];

// ── 견적서 계열 상태 ───────────────────────────────────────────

export const ESTIMATE_STATUS = {
  PENDING: 'pending',
  CONTRACTED: 'contracted',
  EXPIRED: 'expired',
} as const;

export type EstimateStatus =
  (typeof ESTIMATE_STATUS)[keyof typeof ESTIMATE_STATUS];

// ── 프로젝트 상태 ──────────────────────────────────────────────

export const PROJECT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SETTLING: 'settling',
  COMPLETED: 'completed',
  DISCARDED: 'discarded',
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ── 프로젝트 작업 단계 ──────────────────────────────────────────────────

export const WORK_PHASE = {
  PREPARING: 'preparing',
  WORKING: 'working',
  REVIEWING: 'reviewing',
  DELIVERED: 'delivered',
} as const;

export type WorkPhase = (typeof WORK_PHASE)[keyof typeof WORK_PHASE];

// ── 파트너 전문분야 ────────────────────────────────────────────

export const PARTNER_SPECIALTIES = [
  "기획",
  "디자인",
  "퍼블리싱",
  "프론트엔드",
  "백엔드",
  "영상/모션",
] as const;

export type PartnerSpecialty = (typeof PARTNER_SPECIALTIES)[number];

// ── 일정 반복 유형 ──────────────────────────────────────────────────

export const RECURRENCE_TYPE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export type RecurrenceType =
  (typeof RECURRENCE_TYPE)[keyof typeof RECURRENCE_TYPE];
