import { useSearchParams } from "react-router";
import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";
import { Skeleton } from "@/shared/ui/skeleton";
import { useRevenueData } from "./api";
import { RevenueSummary } from "./revenue-summary";
import { MonthlyChart } from "./monthly-chart";
import { OutstandingTable } from "./outstanding-table";

const CURRENT_YEAR = new Date().getFullYear();

export function RevenueModule() {
  const [searchParams] = useSearchParams();
  const year = Number(searchParams.get("year")) || CURRENT_YEAR;
  const { data, isLoading } = useRevenueData(year);

  return (
    <>
      <AppHeader title="매출/수금 통계" />
      <Container className="flex flex-col gap-6 py-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[200px] rounded-lg" />
          </>
        ) : data ? (
          <>
            <RevenueSummary
              prevYear={data.prevYearSummary}
              currentYear={data.currentYearSummary}
              cumulativeOutstanding={data.cumulativeOutstanding}
            />
            <MonthlyChart data={data.monthlyData} year={year} />
            <OutstandingTable projects={data.outstandingProjects} />
          </>
        ) : null}
      </Container>
    </>
  );
}
