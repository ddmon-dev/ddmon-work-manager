import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import { calculateTaxBreakdown } from "@packages/utils";

interface PriceSummaryProps {
  collections: { amount: string }[];
  expenses: { amount: string }[];
  partnerPayments: { amount: string }[];
  contractAmount: number;
  taxType: string | null;
}

export function PriceSummary({ collections, expenses, partnerPayments, contractAmount, taxType }: PriceSummaryProps) {
  const totalPaid = collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpenses =
    expenses.reduce((sum, e) => sum + Number(e.amount), 0) +
    partnerPayments.reduce((sum, pp) => sum + Number(pp.amount), 0);

  const isVat = taxType === "vat";
  const { supplyAmount } = calculateTaxBreakdown(contractAmount, taxType ?? "");

  // 잔금 계산
  const remaining = isVat
    ? contractAmount - Math.min(totalPaid, contractAmount)
    : supplyAmount - totalPaid;

  // 순이익 계산
  const revenueForProfit = isVat ? Math.min(totalPaid, contractAmount) : totalPaid;
  const netProfit = revenueForProfit - totalExpenses;

  return (
    <div className="grid grid-cols-2 gap-3">
      <PriceCard
        label={isVat ? "공급가액" : "계약금액"}
        value={formatCurrency(contractAmount)}
      />
      <PriceCard
        label="입금액"
        value={formatCurrency(totalPaid)}
        variant="positive"
      />
      <PriceCard
        label="잔금"
        value={formatCurrency(Math.max(remaining, 0))}
        variant={remaining > 0 ? "warning" : "normal"}
      />
      <PriceCard
        label="순이익"
        value={formatCurrency(Math.abs(netProfit))}
        variant={netProfit >= 0 ? "positive" : "negative"}
        prefix={netProfit < 0 ? "-" : undefined}
      />
    </div>
  );
}

// ── 내부 컴포넌트 ─────────────────────────────────────────────

interface PriceCardProps {
  label: string;
  value: string;
  variant?: "normal" | "positive" | "negative" | "warning";
  prefix?: string;
}

function PriceCard({ label, value, variant = "normal", prefix }: PriceCardProps) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          variant === "positive" && "text-info",
          variant === "negative" && "text-destructive",
          variant === "warning" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {prefix}{value}원
      </p>
    </div>
  );
}
