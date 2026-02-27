import { formatCurrency } from "@/shared/utils/format";
import { calculateTotal, buildPriceSummaryDisplay } from "@work-manager/utils";
import type { EstimateGroupDTO } from "../types";

interface PriceSummaryProps {
  groups: EstimateGroupDTO[];
  taxType: string;
  discountType: string | null | undefined;
  discountValue: number;
  showTaxAmount: boolean;
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={className ?? "tabular-nums"}>{value}</span>
    </div>
  );
}

export function PriceSummary({ groups, taxType, discountType, discountValue, showTaxAmount }: PriceSummaryProps) {
  const calcGroups = groups.map((g) => ({
    items: g.items.map((i) => ({ amount: Number(i.amount) })),
  }));
  const totals = calculateTotal(calcGroups, taxType, discountType, discountValue);
  const { hasDiscount, showTaxRows, hasDetails, totalLabel, totalValue } =
    buildPriceSummaryDisplay(totals, taxType, showTaxAmount);

  return (
    <div className="bg-muted/30 p-5 space-y-2.5 -mx-4">
      {hasDiscount && (
        <>
          <Row label="합계" value={`${formatCurrency(totals.subtotal)}원`} />
          <Row label="할인" value={`-${formatCurrency(totals.discountAmount)}원`} className="tabular-nums text-red-600" />
        </>
      )}
      {showTaxRows && (
        <>
          <Row label="공급가액" value={`${formatCurrency(totals.supplyAmount)}원`} />
          <Row label="부가세" value={`${formatCurrency(totals.taxAmount)}원`} />
        </>
      )}
      <div className={`${hasDetails ? "border-t pt-3" : ""} flex justify-between items-baseline`}>
        <span className="text-sm font-semibold">{totalLabel}</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {formatCurrency(totalValue)}
          <span className="text-base font-semibold ml-0.5">원</span>
        </span>
      </div>
    </div>
  );
}
