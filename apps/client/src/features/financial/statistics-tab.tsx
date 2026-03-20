import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/utils/format";
import type { RevenueData } from "./types";

const chartConfig = {
  supply: {
    label: "매출액",
    color: "var(--color-chart-1)",
  },
  payment: {
    label: "수금액",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  active: "진행",
  settling: "정산",
  completed: "완료",
  discarded: "폐기",
};

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  pending: "outline",
  active: "default",
  settling: "secondary",
  completed: "default",
  discarded: "destructive",
};

interface StatisticsTabProps {
  data: RevenueData;
  year: number;
}

export function StatisticsTab({ data, year }: StatisticsTabProps) {
  const { prevYearSummary: prevYear, currentYearSummary: currentYear } = data;
  const rows = [prevYear, currentYear];

  const totalSupplyTotal = prevYear.supplyTotal + currentYear.supplyTotal;
  const totalPaymentTotal = prevYear.paymentTotal + currentYear.paymentTotal;
  const totalOutstanding = totalSupplyTotal - totalPaymentTotal;
  const totalCollectionRate =
    totalSupplyTotal > 0
      ? Math.round((totalPaymentTotal / totalSupplyTotal) * 1000) / 10
      : 0;

  const totalVatTotal = prevYear.vatTotal + currentYear.vatTotal;
  const totalVatCollected = prevYear.vatCollected + currentYear.vatCollected;
  const totalVatOutstanding = totalVatTotal - totalVatCollected;

  return (
    <div className="flex flex-col gap-4">
      {/* 수금 현황 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">수금 현황</h2>
          <span className="text-sm text-muted-foreground">
            누적 미수금 :{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(data.cumulativeOutstanding)}원
            </span>
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">연도</TableHead>
              <TableHead className="text-right">매출액</TableHead>
              <TableHead className="text-right">입금액</TableHead>
              <TableHead className="text-right">미수금</TableHead>
              <TableHead className="text-right w-[80px]">수금률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.year}>
                <TableCell className="font-medium">{row.year}년</TableCell>
                <TableCell className="text-right">{formatCurrency(row.supplyTotal)}원</TableCell>
                <TableCell className="text-right">{formatCurrency(row.paymentTotal)}원</TableCell>
                <TableCell className="text-right">{formatCurrency(row.outstanding)}원</TableCell>
                <TableCell className="text-right">{row.collectionRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">합산</TableCell>
              <TableCell className="text-right">{formatCurrency(totalSupplyTotal)}원</TableCell>
              <TableCell className="text-right">{formatCurrency(totalPaymentTotal)}원</TableCell>
              <TableCell className="text-right">{formatCurrency(totalOutstanding)}원</TableCell>
              <TableCell className="text-right">{totalCollectionRate}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      {/* 부가세 현황 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">부가세 현황</h2>
          <span className="text-sm text-muted-foreground">
            누적 미정산 부가세 :{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(data.cumulativeVatOutstanding)}원
            </span>
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">연도</TableHead>
              <TableHead className="text-right">부가세 발생</TableHead>
              <TableHead className="text-right">정산 부가세</TableHead>
              <TableHead className="text-right">미정산 부가세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.year}>
                <TableCell className="font-medium">{row.year}년</TableCell>
                <TableCell className="text-right">{formatCurrency(row.vatTotal)}원</TableCell>
                <TableCell className="text-right">{formatCurrency(row.vatCollected)}원</TableCell>
                <TableCell className="text-right">{formatCurrency(row.vatOutstanding)}원</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">합산</TableCell>
              <TableCell className="text-right">{formatCurrency(totalVatTotal)}원</TableCell>
              <TableCell className="text-right">{formatCurrency(totalVatCollected)}원</TableCell>
              <TableCell className="text-right">{formatCurrency(totalVatOutstanding)}원</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      {/* 월별 차트 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-base font-semibold">{year}년 월별 매출/수금 현황</h2>
        </div>
        <div className="bg-muted/30 p-4 md:p-6">
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart data={data.monthlyData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  value >= 10000 ? `${Math.floor(value / 10000)}만` : value.toLocaleString()
                }
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="supply" fill="var(--color-supply)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payment" fill="var(--color-payment)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      {/* 미수금 프로젝트 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center px-4 py-3 border-b">
          <h2 className="text-base font-semibold">미수금 프로젝트</h2>
        </div>
        {data.outstandingProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            미수금 프로젝트가 없습니다
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>프로젝트명</TableHead>
                <TableHead>클라이언트</TableHead>
                <TableHead className="text-center">세금유형</TableHead>
                <TableHead className="text-right">매출액</TableHead>
                <TableHead className="text-right">입금액</TableHead>
                <TableHead className="text-right">잔액</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.outstandingProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={project.taxType === "vat" ? "default" : "outline"}>
                      {project.taxType === "vat" ? "부가세" : "원천"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(project.contractAmount)}원</TableCell>
                  <TableCell className="text-right">{formatCurrency(project.paidAmount)}원</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(project.outstanding)}원</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANTS[project.status] ?? "outline"}>
                      {STATUS_LABELS[project.status] ?? project.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
