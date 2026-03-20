import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import { calculateTaxBreakdown } from "@packages/utils";

interface PriceSummaryProps {
  collections: { amount: string }[];
  expenses: { amount: string }[];
  partnerPayments: { amount: string }[];
  contractAmount: number;
  taxType: string | null;
}

export function PriceSummary({ collections, expenses, partnerPayments, contractAmount, taxType }: PriceSummaryProps) {
  const totalPaid = collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpenses =
    expenses.reduce((sum, e) => sum + Number(e.amount), 0) +
    partnerPayments.reduce((sum, pp) => sum + Number(pp.amount), 0);

  const isWithholding = taxType === "withholding";
  const isVat = taxType === "vat";

  const { supplyAmount, taxAmount, taxLabel } = calculateTaxBreakdown(contractAmount, taxType ?? "");

  // 순이익: 공급가액 기준 수금(부가세 제외) - 총 지출
  // VAT: 입금액 중 공급가액 충당분만 수익으로 계산 (부가세는 세금이므로 제외)
  // 원천징수: totalPaid가 이미 실수령액이므로 그대로 사용
  const revenueForProfit = isVat ? Math.min(totalPaid, contractAmount) : totalPaid;
  const netProfit = revenueForProfit - totalExpenses;

  // VAT: 공급가액/부가세 순차 충당 분리 표기
  if (isVat) {
    const supplyPaid = Math.min(totalPaid, contractAmount);
    const vatPaid = Math.max(totalPaid - contractAmount, 0);
    const supplyRemaining = contractAmount - supplyPaid;
    const vatRemaining = taxAmount - vatPaid;

    return (
      <div className="space-y-2">
        <AmountRow label="공급가액" value={formatCurrency(contractAmount)}>
          <AmountDetails
            items={[
              { label: "입금", value: formatCurrency(supplyPaid), variant: "positive" },
              { label: "잔금", value: formatCurrency(supplyRemaining) },
            ]}
          />
        </AmountRow>
        <AmountRow label="부가세" value={formatCurrency(taxAmount)}>
          <AmountDetails
            showDivider={totalExpenses <= 0}
            items={[
              { label: "입금", value: formatCurrency(vatPaid), variant: "positive" },
              { label: "잔금", value: formatCurrency(vatRemaining) },
            ]}
          />
        </AmountRow>
        {totalExpenses > 0 && (
          <>
            <Divider />
            <AmountRow label="총 지출" value={formatCurrency(totalExpenses)} variant="negative" />
            <AmountRow
              label="순이익"
              value={formatCurrency(Math.abs(netProfit))}
              variant={netProfit >= 0 ? "positive" : "negative"}
            />
          </>
        )}
      </div>
    );
  }

  // withholding / null: 기존 방식 (실수령액 기준 잔금)
  const remaining = supplyAmount - totalPaid;

  return (
    <div className="space-y-2">
      <AmountRow label="계약금액" value={formatCurrency(contractAmount)}>
        {isWithholding && (
          <AmountDetails
            items={[
              { label: taxLabel, value: formatCurrency(taxAmount), variant: "negative" },
              { label: "실수령액", value: formatCurrency(supplyAmount) },
            ]}
          />
        )}
      </AmountRow>
      <AmountRow
        label="입금"
        value={formatCurrency(totalPaid)}
        variant="positive"
      />
      <Divider />
      <AmountRow
        label="잔금"
        value={formatCurrency(Math.max(remaining, 0))}
      />
      {totalExpenses > 0 && (
        <>
          <Divider />
          <AmountRow label="총 지출" value={formatCurrency(totalExpenses)} variant="negative" />
          <AmountRow
            label="순이익"
            value={formatCurrency(Math.abs(netProfit))}
            variant={netProfit >= 0 ? "positive" : "negative"}
          />
        </>
      )}
    </div>
  );
}

// ── 내부 컴포넌트 ─────────────────────────────────────────────

interface AmountRowProps {
  label: string;
  value: string;
  children?: React.ReactNode;
  isDetail?: boolean;
  variant?: "normal" | "positive" | "negative";
}

function AmountRow({ label, value, children, isDetail, variant = "normal" }: AmountRowProps) {
  const formatted = `${variant === "negative" ? "-" : ""}${value}원`;

  return (
    <div className="group space-y-2">
      <div className={cn("relative flex gap-x-4 justify-between text-sm", isDetail && "pl-6")}>
        <span
          className={cn(
            "relative shrink-0 text-foreground",
            !isDetail && "font-medium",
            isDetail && "text-muted-foreground"
          )}
        >
          {label}
          {isDetail && (
            <span className="absolute bottom-[0.75em] right-full mr-2 h-6 w-1.5 border-b border-l border-muted-foreground/40 group-first:h-4" />
          )}
        </span>
        <span
          className={cn(
            "tabular-nums",
            !isDetail && "font-semibold",
            isDetail && "text-muted-foreground",
            variant === "positive" && "text-info",
            variant === "negative" && "text-destructive"
          )}
        >
          {formatted}
        </span>
      </div>
      {children}
    </div>
  );
}

function AmountDetails({
  items,
  showDivider = true,
}: {
  items: { label: string; value: string; variant?: "positive" | "negative" }[];
  showDivider?: boolean;
}) {
  return (
    <>
      <div className="relative space-y-0.5">
        {items.map((item, i) => (
          <AmountRow
            key={i}
            label={item.label}
            value={item.value}
            isDetail
            variant={item.variant ?? "normal"}
          />
        ))}
      </div>
      {showDivider && <Divider />}
    </>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-border" />;
}
