import type { EstimateStatus } from "./types";

export const ESTIMATE_STATUS = {
  PENDING: "pending",
  CONTRACTED: "contracted",
  EXPIRED: "expired",
} as const;

export const STATUS_LABELS: Record<EstimateStatus, string> = {
  pending: "검토중",
  contracted: "계약됨",
  expired: "만료됨",
};

export const STATUS_VARIANTS: Record<EstimateStatus, string> = {
  pending: "default-light",
  contracted: "success-light",
  expired: "destructive-light",
};

export const TAX_OPTIONS = [
  { value: "exclusive", label: "공급가액에 부가세 별도" },
  { value: "inclusive", label: "공급가액에 부가세 포함" },
] as const;

export const DISCOUNT_OPTIONS = [
  { value: "none", label: "없음" },
  { value: "amount", label: "금액 할인" },
  { value: "percentage", label: "퍼센트 할인" },
] as const;

export const UNIT_OPTIONS = ["식", "페이지", "건"] as const;
export const DEFAULT_UNIT = UNIT_OPTIONS[0];
