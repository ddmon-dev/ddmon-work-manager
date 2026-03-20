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

  const remaining = isVat
    ? contractAmount - Math.min(totalPaid, contractAmount)
    : supplyAmount - totalPaid;

  const revenueForProfit = isVat ? Math.min(totalPaid, contractAmount) : totalPaid;
  const netProfit = revenueForProfit - totalExpenses;

  return (
    <div className="grid grid-cols-2 gap-2">
      <PriceCard
        label={isVat ? "공급가액" : "계약금액"}
        value={formatCurrency(contractAmount)}
      />
      <PriceCard
        label="입금액"
        value={formatCurrency(totalPaid)}
        variant={totalPaid > 0 ? "positive" : "muted"}
      />
      <PriceCard
        label="잔금"
        value={formatCurrency(Math.max(remaining, 0))}
        variant={remaining > 0 ? "warning" : "muted"}
      />
      <PriceCard
        label="순이익"
        value={formatCurrency(Math.abs(netProfit))}
        variant={netProfit > 0 ? "positive" : netProfit < 0 ? "negative" : "muted"}
        prefix={netProfit < 0 ? "-" : undefined}
      />
    </div>
  );
}

// ── 내부 컴포넌트 ─────────────────────────────────────────────

interface PriceCardProps {
  label: string;
  value: string;
  variant?: "normal" | "positive" | "negative" | "warning" | "muted";
  prefix?: string;
}

function PriceCard({ label, value, variant = "normal", prefix }: PriceCardProps) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          variant === "positive" && "text-info",
          variant === "negative" && "text-destructive",
          variant === "warning" && "text-amber-600 dark:text-amber-400",
          variant === "muted" && "text-muted-foreground"
        )}
      >
        {prefix}{value}원
      </p>
    </div>
  );
}
