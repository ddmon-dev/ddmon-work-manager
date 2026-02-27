import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { YearFilter } from "./year-filter";
import type { MonthlyData } from "./types";

const chartConfig = {
  contract: {
    label: "계약액",
    color: "var(--color-chart-1)",
  },
  payment: {
    label: "수금액",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

interface MonthlyChartProps {
  data: MonthlyData[];
  year: number;
}

export function MonthlyChart({ data, year }: MonthlyChartProps) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">
          {year}년 월별 매출/수금 현황
        </h2>
        <YearFilter />
      </div>
      <div className="bg-muted/30 p-4 md:p-6">
        <ChartContainer
          config={chartConfig}
          className="h-[350px] w-full"
        >
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                value >= 10000
                  ? `${Math.floor(value / 10000)}만`
                  : value.toLocaleString()
              }
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="contract"
              fill="var(--color-contract)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="payment"
              fill="var(--color-payment)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}
