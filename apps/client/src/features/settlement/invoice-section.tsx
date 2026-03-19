import { useState } from "react";
import { format } from "date-fns";
import { PAYMENT_TYPE_LABELS } from "@packages/types";
import { Checkbox } from "@/shared/ui/checkbox";
import { DatePicker } from "@/shared/ui/date-picker";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { LoadingButton } from "@/shared/ui/loading-button";
import { formatCurrency } from "@/shared/utils/format";
import { useBatchMarkInvoices } from "./api";
import type { UninvoicedPayment } from "./types";

interface InvoiceSectionProps {
  payments: UninvoicedPayment[];
  year: number;
  month: number;
}

export function InvoiceSection({ payments, year, month }: InvoiceSectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const batchMark = useBatchMarkInvoices(year, month);

  const allSelected = payments.length > 0 && selectedIds.size === payments.length;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payments.map((p) => p.id)));
    }
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
    if (selectedIds.size === 0 || !invoiceDate) return;
    await batchMark.mutateAsync({
      paymentIds: Array.from(selectedIds),
      invoiceDate: format(invoiceDate, "yyyy-MM-dd"),
    });
    setSelectedIds(new Set());
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">세금계산서 미발행</h2>

      {payments.length === 0 ? (
        <InlineEmpty message="미발행 건이 없습니다" />
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="text-left p-3 font-medium">프로젝트</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">클라이언트</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">수금유형</th>
                  <th className="text-right p-3 font-medium">금액</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">수금일</th>
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
                      <div className="text-xs text-muted-foreground md:hidden">
                        {payment.clientName} · {PAYMENT_TYPE_LABELS[payment.paymentType as keyof typeof PAYMENT_TYPE_LABELS] ?? payment.paymentType}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">{payment.clientName}</td>
                    <td className="p-3 hidden md:table-cell">
                      {PAYMENT_TYPE_LABELS[payment.paymentType as keyof typeof PAYMENT_TYPE_LABELS] ?? payment.paymentType}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(Number(payment.amount))}원
                    </td>
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
                value={invoiceDate ?? null}
                onValueChange={(date) => setInvoiceDate(date)}
                placeholder="발행일"
                className="w-[200px]"
              />
              <LoadingButton
                size="sm"
                isLoading={batchMark.isPending}
                onClick={handleBatchMark}
                disabled={!invoiceDate}
              >
                발행 완료 처리
              </LoadingButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
