import { FileSpreadsheet, Clock, FolderKanban, HandCoins } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { useDashboardStats } from "./api";

export function StatsCards() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: "대기중 견적",
      value: data.pendingEstimateCount,
      suffix: "건",
      icon: FileSpreadsheet,
    },
    {
      label: "대기중 프로젝트",
      value: data.pendingProjectCount,
      suffix: "건",
      icon: Clock,
    },
    {
      label: "진행중 프로젝트",
      value: data.activeProjectCount,
      suffix: "건",
      icon: FolderKanban,
    },
    {
      label: "정산중 프로젝트",
      value: data.settlingProjectCount,
      suffix: "건",
      icon: HandCoins,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 md:p-5 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <card.icon className="size-4 text-muted-foreground" />
          </div>
          <div className="text-xl md:text-2xl font-semibold tracking-tight">
            {card.value.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {card.suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
