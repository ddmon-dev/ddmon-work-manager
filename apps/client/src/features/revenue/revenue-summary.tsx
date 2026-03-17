import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatCurrency } from "@/shared/utils/format";
import type { YearlySummary } from "./types";

interface RevenueSummaryProps {
  prevYear: YearlySummary;
  currentYear: YearlySummary;
  cumulativeOutstanding: number;
  cumulativeVatOutstanding: number;
}

export function RevenueSummary({
  prevYear,
  currentYear,
  cumulativeOutstanding,
  cumulativeVatOutstanding,
}: RevenueSummaryProps) {
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
      {/* 섹션 1: 수금 현황 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">수금 현황</h2>
          <span className="text-sm text-muted-foreground">
            누적 미수금 :{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(cumulativeOutstanding)}원
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
                <TableCell className="text-right">
                  {formatCurrency(row.supplyTotal)}원
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.paymentTotal)}원
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.outstanding)}원
                </TableCell>
                <TableCell className="text-right">
                  {row.collectionRate}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">합산</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalSupplyTotal)}원
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalPaymentTotal)}원
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalOutstanding)}원
              </TableCell>
              <TableCell className="text-right">
                {totalCollectionRate}%
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      {/* 섹션 2: 부가세 현황 */}
      <section className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">부가세 현황</h2>
          <span className="text-sm text-muted-foreground">
            누적 미정산 부가세 :{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(cumulativeVatOutstanding)}원
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
                <TableCell className="text-right">
                  {formatCurrency(row.vatTotal)}원
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.vatCollected)}원
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.vatOutstanding)}원
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">합산</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalVatTotal)}원
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalVatCollected)}원
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalVatOutstanding)}원
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>
    </div>
  );
}
