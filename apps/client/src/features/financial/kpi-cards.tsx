import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import type { RevenueData, SettlementData } from "./types";

interface KpiCardsProps {
  revenue: RevenueData | undefined;
  settlement: SettlementData | undefined;
  onPendingClick: () => void;
}

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  highlight?: boolean;
}

function KpiCard({ title, value, sub, onClick, highlight }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-colors",
        onClick && "cursor-pointer hover:border-primary/40",
        !onClick && "cursor-default",
        highlight && "border-destructive/40 bg-destructive/5"
      )}
    >
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </button>
  );
}

export function KpiCards({ revenue, settlement, onPendingClick }: KpiCardsProps) {
  const current = revenue?.currentYearSummary;
  const prev = revenue?.prevYearSummary;

  const supplyTotal = current?.supplyTotal ?? 0;
  const paymentTotal = current?.paymentTotal ?? 0;
  const outstanding = current?.outstanding ?? 0;
  const collectionRate = current?.collectionRate ?? 0;
  const cumulativeOutstanding = revenue?.cumulativeOutstanding ?? 0;

  const prevSupplyTotal = prev?.supplyTotal ?? 0;
  const yearDiff = supplyTotal - prevSupplyTotal;
  const yearDiffLabel = yearDiff >= 0
    ? `+${formatCurrency(yearDiff)}원 (전년 대비)`
    : `-${formatCurrency(Math.abs(yearDiff))}원 (전년 대비)`;

  const uncollectedCount = settlement?.summary.uncollectedCount ?? 0;
  const unreportedCount = settlement?.summary.unreportedCount ?? 0;
  const pendingTotal = uncollectedCount + unreportedCount;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        title="당년 매출"
        value={`${formatCurrency(supplyTotal)}원`}
        sub={prevSupplyTotal > 0 ? yearDiffLabel : undefined}
      />
      <KpiCard
        title="수금액"
        value={`${formatCurrency(paymentTotal)}원`}
        sub={`수금률 ${collectionRate}%`}
      />
      <KpiCard
        title="미수금"
        value={`${formatCurrency(outstanding)}원`}
        sub={cumulativeOutstanding > outstanding ? `누적 ${formatCurrency(cumulativeOutstanding)}원` : undefined}
      />
      <KpiCard
        title="미처리"
        value={`${pendingTotal}건`}
        sub={pendingTotal > 0 ? `미수금 ${uncollectedCount} / 원천세 ${unreportedCount}` : "처리할 건이 없습니다"}
        onClick={pendingTotal > 0 ? onPendingClick : undefined}
        highlight={pendingTotal > 0}
      />
    </div>
  );
}
