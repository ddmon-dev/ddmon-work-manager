import { useState } from "react";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { AppHeader } from "@/shared/ui/app-header";
import { Container } from "@/shared/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useRevenueData, useSettlementData } from "./api";
import { KpiCards } from "./kpi-cards";
import { YearFilter } from "./year-filter";
import { StatisticsTab } from "./statistics-tab";
import { SettlementTab } from "./settlement-tab";
import { WithholdingTab } from "./withholding-tab";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

type TabValue = "statistics" | "settlement" | "withholding";

export function FinancialModule() {
  const { get, set } = useQueryParams();
  const year = Number(get("year")) || CURRENT_YEAR;
  const [activeTab, setActiveTab] = useState<TabValue>("statistics");

  const { data: revenueData, isLoading: revenueLoading } = useRevenueData(year);
  const { data: settlementData } = useSettlementData(year, CURRENT_MONTH);

  function handleYearChange(newYear: number) {
    set({ year: String(newYear) });
  }

  function handlePendingClick() {
    const uncollected = settlementData?.summary.uncollectedCount ?? 0;
    setActiveTab(uncollected > 0 ? "settlement" : "withholding");
  }

  return (
    <>
      <AppHeader title="재무" />
      <Container className="flex flex-col gap-5 py-6">
        <KpiCards
          yearFilter={<YearFilter value={year} onChange={handleYearChange} />}
          revenue={revenueData}
          settlement={settlementData}
          onPendingClick={handlePendingClick}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="statistics">통계</TabsTrigger>
            <TabsTrigger value="settlement">미수금 정산</TabsTrigger>
            <TabsTrigger value="withholding">원천세 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="mt-4">
            {!revenueLoading && revenueData && (
              <StatisticsTab data={revenueData} year={year} />
            )}
          </TabsContent>

          <TabsContent value="settlement" className="mt-4">
            <SettlementTab year={year} />
          </TabsContent>

          <TabsContent value="withholding" className="mt-4">
            <WithholdingTab year={year} />
          </TabsContent>
        </Tabs>
      </Container>
    </>
  );
}
