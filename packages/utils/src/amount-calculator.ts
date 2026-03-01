import { TAX_TYPE, DISCOUNT_TYPE } from "@work-manager/types";

interface CalcItem {
  amount: number;
}

interface CalcGroup {
  items: CalcItem[];
}

/** 그룹 소계 */
export function calculateGroupSubtotal(items: CalcItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** 전체 소계 */
export function calculateSubtotal(groups: CalcGroup[]): number {
  return groups.reduce(
    (sum, group) => sum + calculateGroupSubtotal(group.items),
    0
  );
}

/** 할인 금액 계산 */
export function calculateDiscountAmount(
  subtotal: number,
  discountType: string | null | undefined,
  discountValue: number
): number {
  if (!discountType || discountType === "none" || discountValue <= 0) return 0;
  if (discountType === DISCOUNT_TYPE.AMOUNT) return discountValue;
  if (discountType === DISCOUNT_TYPE.PERCENTAGE)
    return subtotal * (discountValue / 100);
  return 0;
}

export interface TotalCalculation {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  supplyAmount: number;
  total: number;
}

/**
 * 견적서 최종 금액 계산
 *
 * - withholding: 원천징수 (세금 없음, 총액 = 소계 - 할인)
 * - inclusive: 부가세 포함 (공급가액 역산, 총액 = 소계 - 할인)
 * - exclusive: 부가세 별도 (총액 = (소계 - 할인) + 부가세 10%)
 */
export function calculateTotal(
  groups: CalcGroup[],
  taxType: string,
  discountType: string | null | undefined,
  discountValue: number
): TotalCalculation {
  const subtotal = calculateSubtotal(groups);
  const discountAmount = calculateDiscountAmount(
    subtotal,
    discountType,
    discountValue
  );
  const afterDiscount = subtotal - discountAmount;

  let taxAmount = 0;
  let supplyAmount = afterDiscount;
  let total = afterDiscount;

  switch (taxType) {
    case TAX_TYPE.INCLUSIVE:
      supplyAmount = Math.round(afterDiscount / 1.1);
      taxAmount = afterDiscount - supplyAmount;
      total = afterDiscount;
      break;
    case TAX_TYPE.EXCLUSIVE:
      supplyAmount = afterDiscount;
      taxAmount = Math.round(afterDiscount * 0.1);
      total = afterDiscount + taxAmount;
      break;
    default: // withholding: 세금 없음
      taxAmount = 0;
      total = afterDiscount;
      break;
  }

  return { subtotal, discountAmount, afterDiscount, taxAmount, supplyAmount, total };
}

export interface PriceSummaryDisplay {
  hasDiscount: boolean;
  showTaxRows: boolean;
  hasDetails: boolean;
  totalLabel: string;
  totalValue: number;
}

export function buildPriceSummaryDisplay(
  totals: TotalCalculation,
  taxType: string,
  showTaxAmount: boolean
): PriceSummaryDisplay {
  const hasDiscount = totals.discountAmount > 0;
  const isTaxed = taxType !== TAX_TYPE.WITHHOLDING;
  const showTaxRows = isTaxed && showTaxAmount;

  const taxLabel =
    taxType === TAX_TYPE.INCLUSIVE
      ? "VAT 포함"
      : taxType === TAX_TYPE.EXCLUSIVE
        ? showTaxAmount
          ? "VAT 포함"
          : "VAT 별도"
        : "";
  const totalLabel = taxLabel ? `견적가(${taxLabel})` : "견적가";
  const totalValue =
    taxType === TAX_TYPE.EXCLUSIVE && !showTaxAmount
      ? totals.supplyAmount
      : totals.total;

  return {
    hasDiscount,
    showTaxRows,
    hasDetails: hasDiscount || showTaxRows,
    totalLabel,
    totalValue,
  };
}

export interface TaxBreakdown {
  supplyAmount: number;
  taxAmount: number;
  taxLabel: string;
}

/**
 * 계약 금액 + 세금 유형으로 세금 역산
 *
 * - withholding: 원천징수 3.3% (contract_amount = 실수령 전 금액)
 * - inclusive: 부가세 포함 (contract_amount = 부가세 포함 총액)
 * - exclusive: 부가세 별도 (contract_amount = 부가세 포함 총액)
 */
export function calculateTaxBreakdown(
  contractAmount: number,
  taxType: string
): TaxBreakdown {
  if (taxType === TAX_TYPE.WITHHOLDING) {
    const taxAmount = Math.round(contractAmount * 0.033);
    return {
      supplyAmount: contractAmount - taxAmount,
      taxAmount,
      taxLabel: "원천징수(3.3%)",
    };
  }
  const supplyAmount = Math.round(contractAmount / 1.1);
  return {
    supplyAmount,
    taxAmount: contractAmount - supplyAmount,
    taxLabel: "부가세",
  };
}
