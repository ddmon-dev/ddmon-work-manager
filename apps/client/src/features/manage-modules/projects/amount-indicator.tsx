import { formatCurrency } from "@/shared/utils/format";
import { Badge } from "@/shared/ui/badge";
import type { TaxType } from "./types";

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  inclusive: "VAT",
  exclusive: "VAT",
};

interface AmountIndicatorProps {
  contractAmount: number;
  taxType: TaxType | null;
  paid: number;
}

export function AmountIndicator({ contractAmount, taxType, paid }: AmountIndicatorProps) {
  if (contractAmount === 0) return "-";

  const remaining = contractAmount - paid;
  const ratio = contractAmount > 0 ? Math.round((paid / contractAmount) * 100) : 0;

  const isFull = remaining <= 0;
  const isPartial = paid > 0 && remaining > 0;

  const barColor = isFull
    ? "bg-success"
    : isPartial
      ? "bg-warning"
      : "bg-muted-foreground/30";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="tabular-nums font-medium text-xs">
          {formatCurrency(contractAmount)}원
        </span>
        {taxType && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {TAX_TYPE_LABELS[taxType]}
          </Badge>
        )}
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(ratio, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>입금 {formatCurrency(paid)}원</span>
        <span>잔금 {formatCurrency(Math.max(remaining, 0))}원</span>
      </div>
    </div>
  );
}
