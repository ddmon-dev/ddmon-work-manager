import { TAX_TYPE, DISCOUNT_TYPE } from '@work-manager/types';

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

/** 전체 합계 */
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
  if (!discountType || discountType === 'none' || discountValue <= 0) return 0;
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
 * - vat: 부가세 10% (공급가액 = 소계 - 할인, 총액 = 공급가액 + 부가세)
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

  if (taxType === TAX_TYPE.VAT) {
    supplyAmount = afterDiscount;
    taxAmount = Math.round(afterDiscount * 0.1);
    total = afterDiscount + taxAmount;
  }
  // withholding 및 기타: 세금 없음

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    supplyAmount,
    total,
  };
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
  const isTaxed = taxType === TAX_TYPE.VAT;
  const showTaxRows = isTaxed && showTaxAmount;

  let totalLabel: string;
  let totalValue: number;

  if (isTaxed) {
    if (showTaxAmount) {
      totalLabel = '견적가(VAT 포함)';
      totalValue = totals.total;
    } else {
      totalLabel = '견적가(VAT 별도)';
      totalValue = totals.supplyAmount;
    }
  } else {
    totalLabel = '견적가';
    totalValue = totals.total;
  }

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
 * 계약 금액(공급가액) + 세금 유형으로 세금 순산
 *
 * - withholding: 원천징수 3.3% (contractAmount = 원천징수 차감 전 금액)
 * - vat: 부가세 10% (contractAmount = 공급가액, taxAmount = contractAmount × 0.1)
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
      taxLabel: '원천징수(3.3%)',
    };
  }
  // vat: contractAmount는 공급가액
  const taxAmount = Math.round(contractAmount * 0.1);
  return {
    supplyAmount: contractAmount,
    taxAmount,
    taxLabel: '부가세(10%)',
  };
}
