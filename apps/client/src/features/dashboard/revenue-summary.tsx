import { Link } from "react-router";
import { TrendingUp, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/shared/utils/format";
import { useRevenueSummary } from "./api";

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function RevenueSummary() {
  const { data, isLoading } = useRevenueSummary();

  if (isLoading || !data) return null;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {data.currentYear}년 매출 요약
          </h3>
        </div>
        <Link
          to="/revenue"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          자세히 <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <SummaryItem
          label="계약액"
          value={`${formatCurrency(data.contractTotal)}원`}
        />
        <SummaryItem
          label="수금액"
          value={`${formatCurrency(data.paymentTotal)}원`}
        />
        <SummaryItem label="수금률" value={`${data.collectionRate}%`} />
        <SummaryItem
          label="누적 미수금"
          value={`${formatCurrency(data.cumulativeOutstanding)}원`}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>수금 진행률</span>
          <span>{data.collectionRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
