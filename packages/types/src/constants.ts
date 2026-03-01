// ── 세금 ──────────────────────────────────────────────────────

export const TAX_TYPE = {
  WITHHOLDING: "withholding",
  INCLUSIVE: "inclusive",
  EXCLUSIVE: "exclusive",
} as const;

export type TaxType = (typeof TAX_TYPE)[keyof typeof TAX_TYPE];

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  withholding: "원천징수",
  exclusive: "VAT 별도",
  inclusive: "VAT 포함",
} as const;

// ── 할인 ──────────────────────────────────────────────────────

export const DISCOUNT_TYPE = {
  NONE: "none",
  AMOUNT: "amount",
  PERCENTAGE: "percentage",
} as const;

export type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE];

// ── 견적서 계열 상태 ───────────────────────────────────────────

export const ESTIMATE_STATUS = {
  PENDING: "pending",
  CONTRACTED: "contracted",
  EXPIRED: "expired",
} as const;

export type EstimateStatus =
  (typeof ESTIMATE_STATUS)[keyof typeof ESTIMATE_STATUS];

// ── 프로젝트 상태 ──────────────────────────────────────────────

export const PROJECT_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  SETTLING: "settling",
  COMPLETED: "completed",
  DISCARDED: "discarded",
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ── 작업 단계 ──────────────────────────────────────────────────

export const WORK_PHASE = {
  PREPARING: "preparing",
  WORKING: "working",
  REVIEWING: "reviewing",
  DELIVERED: "delivered",
} as const;

export type WorkPhase = (typeof WORK_PHASE)[keyof typeof WORK_PHASE];

// ── 반복 유형 ──────────────────────────────────────────────────

export const RECURRENCE_TYPE = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

export type RecurrenceType =
  (typeof RECURRENCE_TYPE)[keyof typeof RECURRENCE_TYPE];
