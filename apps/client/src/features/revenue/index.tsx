import { useQueryParams } from "@/shared/hooks/use-query-params";
import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";
import { useRevenueData } from "./api";
import { RevenueSummary } from "./revenue-summary";
import { MonthlyChart } from "./monthly-chart";
import { OutstandingTable } from "./outstanding-table";

const CURRENT_YEAR = new Date().getFullYear();

export function RevenueModule() {
  const { get } = useQueryParams();
  const year = Number(get("year")) || CURRENT_YEAR;
  const { data, isLoading } = useRevenueData(year);

  return (
    <>
      <AppHeader title="매출/수금 통계" />
      <Container className="flex flex-col gap-6 py-6">
        {!isLoading && data ? (
          <>
            <RevenueSummary
              prevYear={data.prevYearSummary}
              currentYear={data.currentYearSummary}
              cumulativeOutstanding={data.cumulativeOutstanding}
              cumulativeVatOutstanding={data.cumulativeVatOutstanding}
            />
            <MonthlyChart data={data.monthlyData} year={year} />
            <OutstandingTable projects={data.outstandingProjects} />
          </>
        ) : null}
      </Container>
    </>
  );
}
