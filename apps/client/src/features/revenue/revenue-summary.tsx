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
}

export function RevenueSummary({
  prevYear,
  currentYear,
  cumulativeOutstanding,
}: RevenueSummaryProps) {
  const rows = [prevYear, currentYear];

  const totalContractTotal =
    prevYear.contractTotal + currentYear.contractTotal;
  const totalNetReceivableTotal =
    prevYear.netReceivableTotal + currentYear.netReceivableTotal;
  const totalPaymentTotal =
    prevYear.paymentTotal + currentYear.paymentTotal;
  const totalOutstanding = totalNetReceivableTotal - totalPaymentTotal;
  const totalCollectionRate =
    totalNetReceivableTotal > 0
      ? Math.round(
          (totalPaymentTotal / totalNetReceivableTotal) * 1000
        ) / 10
      : 0;

  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">연도별 요약</h2>
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
            <TableHead className="text-right">계약액</TableHead>
            <TableHead className="text-right">실수령액</TableHead>
            <TableHead className="text-right">수금액</TableHead>
            <TableHead className="text-right">미수금</TableHead>
            <TableHead className="text-right w-[80px]">수금률</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.year}>
              <TableCell className="font-medium">{row.year}년</TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.contractTotal)}원
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.netReceivableTotal)}원
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
              {formatCurrency(totalContractTotal)}원
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(totalNetReceivableTotal)}원
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
  );
}
