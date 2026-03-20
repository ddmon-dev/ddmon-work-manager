import { useState } from "react";
import { format } from "date-fns";
import { Checkbox } from "@/shared/ui/checkbox";
import { DatePicker } from "@/shared/ui/date-picker";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { LoadingButton } from "@/shared/ui/loading-button";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { formatCurrency } from "@/shared/utils/format";
import { useBatchMarkWithholdings, useSettlementData } from "./api";
import type { UnreportedPartnerPayment } from "./types";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface WithholdingTabProps {
  year: number;
}

export function WithholdingTab({ year }: WithholdingTabProps) {
  const [month, setMonth] = useState<number | null>(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState(year);
  const { data, isLoading } = useSettlementData(filterYear, month);

  const payments = data?.unreportedPartnerPayments ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <NativeSelect
          value={String(filterYear)}
          onChange={(e) => setFilterYear(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map((y) => (
            <NativeSelectOption key={y} value={String(y)}>
              {y}년
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={month === null ? "all" : String(month)}
          onChange={(e) => setMonth(e.target.value === "all" ? null : Number(e.target.value))}
        >
          <NativeSelectOption value="all">전체</NativeSelectOption>
          {MONTH_OPTIONS.map((m) => (
            <NativeSelectOption key={m} value={String(m)}>
              {m}월
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {isLoading ? null : (
        <PaymentList payments={payments} year={filterYear} month={month} />
      )}
    </div>
  );
}

// ── 원천세 미신고 목록 + 배치 처리 ───────────────────────────

interface PaymentListProps {
  payments: UnreportedPartnerPayment[];
  year: number;
  month: number | null;
}

function PaymentList({ payments, year, month }: PaymentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reportedDate, setReportedDate] = useState<Date | undefined>(new Date());
  const batchMark = useBatchMarkWithholdings(year, month);

  const allSelected = payments.length > 0 && selectedIds.size === payments.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(payments.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchMark() {
    if (selectedIds.size === 0 || !reportedDate) return;
    await batchMark.mutateAsync({
      partnerPaymentIds: Array.from(selectedIds),
      reportedDate: format(reportedDate, "yyyy-MM-dd"),
    });
    setSelectedIds(new Set());
  }

  if (payments.length === 0) {
    return <InlineEmpty message="미신고 건이 없습니다" />;
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 p-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="text-left p-3 font-medium">프로젝트</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">파트너</th>
              <th className="text-right p-3 font-medium">금액</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">지급일</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">내용</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="p-3">
                  <Checkbox
                    checked={selectedIds.has(payment.id)}
                    onCheckedChange={() => toggleOne(payment.id)}
                  />
                </td>
                <td className="p-3">
                  <div>{payment.projectName}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{payment.partnerName}</div>
                </td>
                <td className="p-3 hidden md:table-cell">{payment.partnerName}</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(Number(payment.amount))}원</td>
                <td className="p-3 hidden md:table-cell">{payment.paidDate}</td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">
                  {payment.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <span className="text-sm font-medium">{selectedIds.size}건 선택</span>
          <DatePicker
            value={reportedDate ?? null}
            onValueChange={(date) => setReportedDate(date)}
            placeholder="신고일"
            className="w-[200px]"
          />
          <LoadingButton
            size="sm"
            isLoading={batchMark.isPending}
            onClick={handleBatchMark}
            disabled={!reportedDate}
          >
            신고 완료 처리
          </LoadingButton>
        </div>
      )}
    </>
  );
}
