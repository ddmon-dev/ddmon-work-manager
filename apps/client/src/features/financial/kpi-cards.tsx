import { TrendingUp, Wallet, AlertCircle, ClipboardCheck } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import type { RevenueData, SettlementData } from "./types";

interface KpiCardsProps {
  revenue: RevenueData | undefined;
  settlement: SettlementData | undefined;
  onPendingClick: () => void;
  yearFilter: React.ReactNode;
}

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "red";
  onClick?: () => void;
}

function KpiCard({ icon, title, value, sub, accent, onClick }: KpiCardProps) {
  const accentStyles = {
    blue: "border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20",
    green: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20",
    amber: "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20",
    red: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
  };

  const iconStyles = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-xl border p-4 lg:p-5 text-left transition-all",
        accent ? accentStyles[accent] : "bg-card",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01]",
        !onClick && "cursor-default"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("shrink-0", accent ? iconStyles[accent] : "text-muted-foreground")}>
          {icon}
        </span>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </button>
  );
}

export function KpiCards({ revenue, settlement, onPendingClick, yearFilter }: KpiCardsProps) {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {yearFilter}
        <p className="text-sm text-muted-foreground">
          {current?.year ?? CURRENT_YEAR}년 재무 현황
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
        icon={<TrendingUp className="size-4" />}
        accent="blue"
        title="당년 매출"
        value={`${formatCurrency(supplyTotal)}원`}
        sub={prevSupplyTotal > 0 ? yearDiffLabel : undefined}
      />
      <KpiCard
        icon={<Wallet className="size-4" />}
        accent="green"
        title="수금액"
        value={`${formatCurrency(paymentTotal)}원`}
        sub={`수금률 ${collectionRate}%`}
      />
      <KpiCard
        icon={<AlertCircle className="size-4" />}
        accent={outstanding > 0 ? "amber" : undefined}
        title="미수금"
        value={`${formatCurrency(outstanding)}원`}
        sub={cumulativeOutstanding > outstanding ? `누적 ${formatCurrency(cumulativeOutstanding)}원` : undefined}
      />
      <KpiCard
        icon={<ClipboardCheck className="size-4" />}
        accent={pendingTotal > 0 ? "red" : undefined}
        title="미처리"
        value={`${pendingTotal}건`}
        sub={pendingTotal > 0 ? `미수금 ${uncollectedCount} / 원천세 ${unreportedCount}` : "처리 완료"}
        onClick={pendingTotal > 0 ? onPendingClick : undefined}
      />
      </div>
    </div>
  );
}

const CURRENT_YEAR = new Date().getFullYear();
