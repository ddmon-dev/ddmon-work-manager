import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { PAYMENT_TYPE_LABELS } from "@packages/types";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { DatePicker } from "@/shared/ui/date-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Badge } from "@/shared/ui/badge";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { DetailSectionTitle } from "../_base/ui";
import {
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreatePartnerPayment,
  useUpdatePartnerPayment,
  useDeletePartnerPayment,
} from "./api";
import type {
  InvoiceDTO,
  PaymentDTO,
  ExpenseDTO,
  PartnerPaymentDTO,
  ProjectPartnerDTO,
} from "./types";

// ── 타입 ────────────────────────────────────────────────────

type TransactionType = "payment" | "expense" | "partnerPayment";

interface UnifiedTransaction {
  type: TransactionType;
  id: string;
  date: string;
  amount: number;
  description: string;
  paymentType?: string;
  partnerId?: string;
  partnerName?: string;
  withholdingReported?: boolean;
  withholdingReportedDate?: string | null;
  readOnly?: boolean;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  payment: "수금",
  expense: "지출",
  partnerPayment: "파트너지급",
};

const TYPE_DOT_COLORS: Record<TransactionType, string> = {
  payment: "bg-blue-500",
  expense: "bg-red-500",
  partnerPayment: "bg-orange-500",
};

// ── 메인 컴포넌트 ──────────────────────────────────────────────

interface ProjectFinancialSectionProps {
  projectId: string;
  invoices: InvoiceDTO[];
  payments: PaymentDTO[];
  expenses: ExpenseDTO[];
  partnerPayments: PartnerPaymentDTO[];
  projectPartners: ProjectPartnerDTO[];
  taxType: string | null;
  refetch: () => void;
}

export function ProjectFinancialSection({
  projectId,
  invoices,
  payments,
  expenses,
  partnerPayments,
  projectPartners,
  taxType,
  refetch,
}: ProjectFinancialSectionProps) {
  const transactions = buildUnifiedTransactions(invoices, payments, expenses, partnerPayments, taxType);

  return (
    <div>
      <DetailSectionTitle>거래 내역</DetailSectionTitle>
      <TransactionList
        projectId={projectId}
        transactions={transactions}
        taxType={taxType}
        refetch={refetch}
      />
    </div>
  );
}

// ── 통합 변환 ──────────────────────────────────────────────────

function buildUnifiedTransactions(
  invoices: InvoiceDTO[],
  payments: PaymentDTO[],
  expenses: ExpenseDTO[],
  partnerPayments: PartnerPaymentDTO[],
  taxType: string | null
): UnifiedTransaction[] {
  const unified: UnifiedTransaction[] = [];

  // VAT: 수금완료 세금계산서를 읽기전용으로 포함
  if (taxType === "vat") {
    unified.push(
      ...invoices
        .filter((i) => i.paidDate !== null)
        .map((i) => ({
          type: "payment" as const,
          id: i.id,
          date: i.paidDate!,
          amount: Number(i.amount),
          description: i.description || "세금계산서",
          paymentType: i.paymentType,
          readOnly: true,
        }))
    );
  }

  // 원천징수: payments 그대로
  if (taxType !== "vat") {
    unified.push(
      ...payments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        date: p.paidDate,
        amount: Number(p.amount),
        description: p.description,
        paymentType: p.paymentType,
      }))
    );
  }

  unified.push(
    ...expenses.map((e) => ({
      type: "expense" as const,
      id: e.id,
      date: e.expenseDate,
      amount: Number(e.amount),
      description: e.description,
    })),
    ...partnerPayments.map((pp) => ({
      type: "partnerPayment" as const,
      id: pp.id,
      date: pp.paidDate,
      amount: Number(pp.amount),
      description: pp.description,
      partnerId: pp.partnerId,
      partnerName: pp.partner.name,
      withholdingReported: pp.withholdingReported,
      withholdingReportedDate: pp.withholdingReportedDate,
    }))
  );

  return unified.sort((a, b) => a.date.localeCompare(b.date));
}

// ── 거래 목록 ──────────────────────────────────────────────────

interface TransactionListProps {
  projectId: string;
  transactions: UnifiedTransaction[];
  taxType: string | null;
  refetch: () => void;
}

function TransactionList({ projectId, transactions, taxType, refetch }: TransactionListProps) {
  const dialog = useDialog();
  const deletePayment = useDeletePayment();
  const deleteExpense = useDeleteExpense();
  const deletePartnerPayment = useDeletePartnerPayment();
  const updatePayment = useUpdatePayment();
  const updatePartnerPayment = useUpdatePartnerPayment();

  const handleDelete = (tx: UnifiedTransaction) => {
    const labels: Record<TransactionType, string> = {
      payment: "수금 내역",
      expense: "지출 내역",
      partnerPayment: "파트너 지급 내역",
    };
    dialog.confirm({
      title: `${labels[tx.type]} 삭제`,
      description: `이 ${labels[tx.type]}을 삭제하시겠습니까?`,
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        if (tx.type === "payment") {
          await deletePayment.mutateAsync({ projectId, paymentId: tx.id });
        } else if (tx.type === "expense") {
          await deleteExpense.mutateAsync({ projectId, expenseId: tx.id });
        } else {
          await deletePartnerPayment.mutateAsync({ projectId, partnerPaymentId: tx.id });
        }
        refetch();
      },
    });
  };

  const handleWithholdingToggle = (tx: UnifiedTransaction, checked: boolean) => {
    updatePartnerPayment.mutate({
      projectId,
      partnerPaymentId: tx.id,
      withholdingReported: checked,
      withholdingReportedDate: checked ? tx.date : null,
    });
  };

  if (transactions.length === 0) {
    return <InlineEmpty message="아직 거래 내역이 없습니다." />;
  }

  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {transactions.map((tx) => (
        <li key={`${tx.type}-${tx.id}`} className="group relative py-3 px-4 text-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between gap-x-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`size-2 rounded-full shrink-0 ${TYPE_DOT_COLORS[tx.type]}`} />
              <span className="text-muted-foreground text-xs shrink-0">{TYPE_LABELS[tx.type]}</span>
              {tx.type === "payment" && tx.paymentType && (
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">
                  {PAYMENT_TYPE_LABELS[tx.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
                </Badge>
              )}
              {tx.type === "partnerPayment" && tx.partnerName && (
                <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">
                  {tx.partnerName}
                </Badge>
              )}
              <span className="truncate font-medium">{tx.description}</span>
            </div>
            <span
              className={`font-semibold shrink-0 tabular-nums ${
                tx.type === "payment" ? "text-info" : "text-destructive"
              }`}
            >
              {tx.type !== "payment" && "-"}
              {formatCurrency(tx.amount)}원
            </span>
          </div>
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">{tx.date}</span>
              {tx.readOnly && (
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">세금계산서</Badge>
              )}
              {tx.type === "partnerPayment" && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    className="size-4 md:size-3.5 rounded-[3px]"
                    checked={tx.withholdingReported}
                    onCheckedChange={(checked) => handleWithholdingToggle(tx, !!checked)}
                  />
                  <span className="text-xs text-muted-foreground">원천세 신고</span>
                </label>
              )}
            </div>
            {!tx.readOnly && (
              <nav className="flex items-center -mb-1 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <EditTransactionButton
                  projectId={projectId}
                  transaction={tx}
                  taxType={taxType}
                  onSuccess={refetch}
                />
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDelete(tx)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </nav>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── 수정 팝오버 ────────────────────────────────────────────────

function EditTransactionButton({
  projectId,
  transaction: tx,
  taxType,
  onSuccess,
}: {
  projectId: string;
  transaction: UnifiedTransaction;
  taxType: string | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <PencilIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <EditTransactionForm
          projectId={projectId}
          transaction={tx}
          taxType={taxType}
          onSuccess={() => {
            setOpen(false);
            onSuccess();
          }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function EditTransactionForm({
  projectId,
  transaction: tx,
  taxType,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  transaction: UnifiedTransaction;
  taxType: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState<number | undefined>(tx.amount);
  const [date, setDate] = useState<Date>(parseISO(tx.date));
  const [paymentType, setPaymentType] = useState(tx.paymentType ?? "deposit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePayment = useUpdatePayment();
  const updateExpense = useUpdateExpense();
  const updatePartnerPayment = useUpdatePartnerPayment();

  const handleSubmit = async () => {
    if (!amount || !date) return;
    setIsSubmitting(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      if (tx.type === "payment") {
        await updatePayment.mutateAsync({
          projectId,
          paymentId: tx.id,
          description: description.trim() || undefined,
          amount,
          paidDate: dateStr,
          paymentType,
        });
      } else if (tx.type === "expense") {
        await updateExpense.mutateAsync({
          projectId,
          expenseId: tx.id,
          description: description.trim() || undefined,
          amount,
          expenseDate: dateStr,
        });
      } else {
        await updatePartnerPayment.mutateAsync({
          projectId,
          partnerPaymentId: tx.id,
          description: description.trim() || undefined,
          amount,
          paidDate: dateStr,
        });
      }
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {tx.type === "payment" && (
        <NativeSelect value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
          {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="내용 (선택)"
      />
      <div className="grid grid-cols-2 gap-2">
        <AmountInput
          value={amount}
          onChange={setAmount}
          placeholder={getAmountPlaceholder(tx.type, taxType)}
        />
        <DatePicker
          mode="single"
          value={date}
          onValueChange={(d) => d && setDate(d)}
          placeholder="날짜"
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          취소
        </Button>
        <LoadingButton size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
          저장
        </LoadingButton>
      </div>
    </div>
  );
}

// ── 생성 폼 ────────────────────────────────────────────────────

interface TransactionFormProps {
  projectId: string;
  projectPartners: ProjectPartnerDTO[];
  taxType: string | null;
  onSuccess: () => void;
}

export function TransactionForm({ projectId, projectPartners, taxType, onSuccess }: TransactionFormProps) {
  const [activeType, setActiveType] = useState<TransactionType>(taxType === "vat" ? "expense" : "payment");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [date, setDate] = useState<Date>(new Date());
  const [paymentType, setPaymentType] = useState<string>("deposit");
  const [partnerId, setPartnerId] = useState(projectPartners[0]?.partnerId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPayment = useCreatePayment();
  const createExpense = useCreateExpense();
  const createPartnerPayment = useCreatePartnerPayment();

  const handleSubmit = async () => {
    if (!amount || !date) return;
    if (activeType === "partnerPayment" && !partnerId) return;

    setIsSubmitting(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      if (activeType === "payment") {
        await createPayment.mutateAsync({
          projectId,
          description: description.trim(),
          amount,
          paidDate: dateStr,
          paymentType: paymentType as "deposit" | "interim" | "balance" | "additional",
        });
      } else if (activeType === "expense") {
        await createExpense.mutateAsync({
          projectId,
          description: description.trim(),
          amount,
          expenseDate: dateStr,
        });
      } else {
        await createPartnerPayment.mutateAsync({
          projectId,
          partnerId,
          description: description.trim(),
          amount,
          paidDate: dateStr,
        });
      }
      setDescription("");
      setAmount(undefined);
      setDate(new Date());
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeButtons: { type: TransactionType; label: string }[] = [
    ...(taxType !== "vat" ? [{ type: "payment" as const, label: "수금" }] : []),
    { type: "expense", label: "지출" },
    { type: "partnerPayment", label: "파트너지급" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {typeButtons.map(({ type, label }) => (
          <Button
            key={type}
            type="button"
            variant={activeType === type ? "default" : "secondary"}
            size="xs"
            onClick={() => setActiveType(type)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 items-start">
        {activeType === "payment" && (
          <NativeSelect value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        {activeType === "partnerPayment" && projectPartners.length > 0 && (
          <NativeSelect value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            {projectPartners.map((pp) => (
              <NativeSelectOption key={pp.partnerId} value={pp.partnerId}>
                {pp.partner.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        <Input
          className="flex-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="내용 (선택)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <AmountInput
          value={amount}
          onChange={setAmount}
          placeholder={getAmountPlaceholder(activeType, taxType)}
          className="w-32"
        />
        <DatePicker
          mode="single"
          value={date}
          onValueChange={(d) => d && setDate(d)}
          placeholder="날짜"
        />
        <LoadingButton
          rounded="full"
          isLoading={isSubmitting}
          onClick={handleSubmit}
        >
          추가
        </LoadingButton>
      </div>
    </div>
  );
}

// ── 금액 입력 (FormNumberInput 패턴 재활용) ────────────────────────

function toDisplay(value: number | undefined, thousandSeparator: boolean): string {
  if (value === undefined || isNaN(value)) return "";
  return thousandSeparator ? value.toLocaleString("ko-KR") : String(value);
}

function parseRawInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function AmountInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => toDisplay(value, true));

  useEffect(() => {
    setDisplay(toDisplay(value, true));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,\-]/g, "");
    setDisplay(raw);
    const num = parseRawInput(raw);
    onChange(num || undefined);
  };

  const handleBlur = () => {
    setDisplay(toDisplay(value, true));
  };

  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Input
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="pr-8"
      />
      <span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">원</span>
    </div>
  );
}

// ── 유틸 ────────────────────────────────────────────────────────

function getAmountPlaceholder(type: TransactionType, taxType: string | null): string {
  if (type === "payment") {
    if (taxType === "vat") return "VAT 포함";
    if (taxType === "withholding") return "실수령액";
    return "금액";
  }
  if (type === "partnerPayment") return "실지급액 (3.3% 차감 후)";
  return "금액";
}
