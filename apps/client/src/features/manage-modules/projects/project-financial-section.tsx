import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { PAYMENT_TYPE_LABELS } from "@packages/types";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
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
  invoiceIssued?: boolean;
  invoiceDate?: string | null;
  partnerId?: string;
  partnerName?: string;
  withholdingReported?: boolean;
  withholdingReportedDate?: string | null;
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
  payments: PaymentDTO[];
  expenses: ExpenseDTO[];
  partnerPayments: PartnerPaymentDTO[];
  projectPartners: ProjectPartnerDTO[];
  taxType: string | null;
  refetch: () => void;
}

export function ProjectFinancialSection({
  projectId,
  payments,
  expenses,
  partnerPayments,
  projectPartners,
  taxType,
  refetch,
}: ProjectFinancialSectionProps) {
  const transactions = buildUnifiedTransactions(payments, expenses, partnerPayments);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DetailSectionTitle>거래 내역</DetailSectionTitle>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <TransactionList
          projectId={projectId}
          transactions={transactions}
          taxType={taxType}
          refetch={refetch}
        />
      </div>
      <div className="sticky bottom-0 border-t border-border-dark/50 bg-background/60 backdrop-blur-md pt-3 -mx-4 px-4 -mb-4 pb-4">
        <TransactionForm
          projectId={projectId}
          projectPartners={projectPartners}
          taxType={taxType}
          onSuccess={refetch}
        />
      </div>
    </div>
  );
}

// ── 통합 변환 ──────────────────────────────────────────────────

function buildUnifiedTransactions(
  payments: PaymentDTO[],
  expenses: ExpenseDTO[],
  partnerPayments: PartnerPaymentDTO[]
): UnifiedTransaction[] {
  const unified: UnifiedTransaction[] = [
    ...payments.map((p) => ({
      type: "payment" as const,
      id: p.id,
      date: p.paidDate,
      amount: Number(p.amount),
      description: p.description,
      paymentType: p.paymentType,
      invoiceIssued: p.invoiceIssued,
      invoiceDate: p.invoiceDate,
    })),
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
    })),
  ];

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

  const handleInvoiceToggle = (tx: UnifiedTransaction, checked: boolean) => {
    updatePayment.mutate({
      projectId,
      paymentId: tx.id,
      invoiceIssued: checked,
      invoiceDate: checked ? tx.date : null,
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
              {tx.type === "payment" && taxType === "vat" && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    className="size-4 md:size-3.5 rounded-[3px]"
                    checked={tx.invoiceIssued}
                    onCheckedChange={(checked) => handleInvoiceToggle(tx, !!checked)}
                  />
                  <span className="text-xs text-muted-foreground">세금계산서</span>
                </label>
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
  const [amount, setAmount] = useState(String(tx.amount));
  const [date, setDate] = useState(tx.date);
  const [paymentType, setPaymentType] = useState(tx.paymentType ?? "deposit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePayment = useUpdatePayment();
  const updateExpense = useUpdateExpense();
  const updatePartnerPayment = useUpdatePartnerPayment();

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!description.trim() || !numAmount || !date) return;
    setIsSubmitting(true);
    try {
      if (tx.type === "payment") {
        await updatePayment.mutateAsync({
          projectId,
          paymentId: tx.id,
          description: description.trim(),
          amount: numAmount,
          paidDate: date,
          paymentType,
        });
      } else if (tx.type === "expense") {
        await updateExpense.mutateAsync({
          projectId,
          expenseId: tx.id,
          description: description.trim(),
          amount: numAmount,
          expenseDate: date,
        });
      } else {
        await updatePartnerPayment.mutateAsync({
          projectId,
          partnerPaymentId: tx.id,
          description: description.trim(),
          amount: numAmount,
          paidDate: date,
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
        placeholder="내용"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={getAmountPlaceholder(tx.type, taxType)}
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

function TransactionForm({ projectId, projectPartners, taxType, onSuccess }: TransactionFormProps) {
  const [activeType, setActiveType] = useState<TransactionType>("payment");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentType, setPaymentType] = useState<string>("deposit");
  const [partnerId, setPartnerId] = useState(projectPartners[0]?.partnerId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPayment = useCreatePayment();
  const createExpense = useCreateExpense();
  const createPartnerPayment = useCreatePartnerPayment();

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!description.trim() || !numAmount || !date) return;
    if (activeType === "partnerPayment" && !partnerId) return;

    setIsSubmitting(true);
    try {
      if (activeType === "payment") {
        await createPayment.mutateAsync({
          projectId,
          description: description.trim(),
          amount: numAmount,
          paidDate: date,
          paymentType: paymentType as "deposit" | "interim" | "balance" | "additional",
        });
      } else if (activeType === "expense") {
        await createExpense.mutateAsync({
          projectId,
          description: description.trim(),
          amount: numAmount,
          expenseDate: date,
        });
      } else {
        await createPartnerPayment.mutateAsync({
          projectId,
          partnerId,
          description: description.trim(),
          amount: numAmount,
          paidDate: date,
        });
      }
      setDescription("");
      setAmount("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeButtons: { type: TransactionType; label: string }[] = [
    { type: "payment", label: "수금" },
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
          placeholder="내용"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Input
          className="w-28"
          type="number"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={getAmountPlaceholder(activeType, taxType)}
        />
        <Input
          className="w-36"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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

// ── 유틸 ────────────────────────────────────────────────────────

function getAmountPlaceholder(type: TransactionType, taxType: string | null): string {
  if (type === "payment") {
    if (taxType === "vat") return "VAT 포함 입금액";
    if (taxType === "withholding") return "실수령액 (3.3% 차감 후)";
    return "금액";
  }
  return "금액";
}
