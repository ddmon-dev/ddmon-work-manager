import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Badge } from "@/shared/ui/badge";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { FormNumberInput, FormDatePicker, FormNativeSelect, FormTextInput } from "@/shared/ui/form";
import { DetailSectionTitle } from "../_base/ui";
import {
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreatePartnerPayment,
  useUpdatePartnerPayment,
  useDeletePartnerPayment,
} from "./api";
import type {
  ExpenseDTO,
  PartnerPaymentDTO,
  ProjectPartnerDTO,
} from "./types";

// ── 스키마 ──────────────────────────────────────────────────

const transactionFormSchema = z.object({
  description: z.string().default(""),
  amount: z.number().optional(),
  date: z.date().default(() => new Date()),
  partnerId: z.string().default(""),
});
type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const editTransactionFormSchema = z.object({
  description: z.string().default(""),
  amount: z.number().optional(),
  date: z.date().default(() => new Date()),
});
type EditTransactionFormValues = z.infer<typeof editTransactionFormSchema>;

// ── 타입 ────────────────────────────────────────────────────

type TransactionType = "expense" | "partnerPayment";

interface UnifiedTransaction {
  type: TransactionType;
  id: string;
  date: string;
  amount: number;
  description: string;
  partnerId?: string;
  partnerName?: string;
  withholdingReported?: boolean;
  withholdingReportedDate?: string | null;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "지출",
  partnerPayment: "파트너지급",
};

const TYPE_DOT_COLORS: Record<TransactionType, string> = {
  expense: "bg-red-500",
  partnerPayment: "bg-orange-500",
};

// ── 진행바 ─────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────

interface ProjectExpenseSectionProps {
  projectId: string;
  expenses: ExpenseDTO[];
  partnerPayments: PartnerPaymentDTO[];
  projectPartners: ProjectPartnerDTO[];
  refetch: () => void;
}

export function ProjectExpenseSection({
  projectId,
  expenses,
  partnerPayments,
  projectPartners,
  refetch,
}: ProjectExpenseSectionProps) {
  const transactions = buildUnifiedTransactions(expenses, partnerPayments);

  return (
    <div className="space-y-4">
      <div>
        <DetailSectionTitle>지출 / 정산</DetailSectionTitle>

        {projectPartners.length > 0 && (
          <PartnerSettlementOverview
            projectPartners={projectPartners}
            partnerPayments={partnerPayments}
          />
        )}
      </div>

      <TransactionForm
        projectId={projectId}
        projectPartners={projectPartners}
        onSuccess={refetch}
      />

      <TransactionList
        projectId={projectId}
        transactions={transactions}
        refetch={refetch}
      />
    </div>
  );
}

// ── 파트너 정산 현황 ─────────────────────────────────────────────

function PartnerSettlementOverview({
  projectPartners,
  partnerPayments,
}: {
  projectPartners: ProjectPartnerDTO[];
  partnerPayments: PartnerPaymentDTO[];
}) {
  const partnersWithAmount = projectPartners.filter((pp) => pp.amount && Number(pp.amount) > 0);
  if (partnersWithAmount.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3 text-xs">
      {partnersWithAmount.map((pp) => {
        const assignedAmount = Number(pp.amount);
        const isWithholding = pp.taxType === "withholding";
        const taxAmount = isWithholding
          ? assignedAmount * 0.033
          : assignedAmount * 0.1;
        const totalPayable = isWithholding
          ? assignedAmount - taxAmount
          : assignedAmount + taxAmount;

        const paidAmount = partnerPayments
          .filter((pay) => pay.partnerId === pp.partnerId)
          .reduce((sum, pay) => sum + Number(pay.amount), 0);
        const unsettled = totalPayable - paidAmount;

        return (
          <div key={pp.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{pp.partner.name}</span>
              {pp.roles && pp.roles.length > 0 && (
                <span className="text-muted-foreground">({pp.roles.join(", ")})</span>
              )}
              <Badge variant="muted" className="text-[10px] px-1 py-0">
                {isWithholding ? "원천징수" : "부가세"}
              </Badge>
            </div>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>배정금액</span>
                <span className="tabular-nums">{formatCurrency(assignedAmount)}원</span>
              </div>
              <div className="flex justify-between">
                <span>{isWithholding ? "원천세(3.3%)" : "부가세(10%)"}</span>
                <span className="tabular-nums">
                  {isWithholding ? "-" : "+"}{formatCurrency(taxAmount)}원
                </span>
              </div>
              <div className="flex justify-between font-medium text-foreground">
                <span>{isWithholding ? "실지급액" : "총지급액"}</span>
                <span className="tabular-nums">{formatCurrency(totalPayable)}원</span>
              </div>
            </div>
            <ProgressBar current={paidAmount} total={totalPayable} />
            <div className="flex justify-between text-muted-foreground">
              <span>지급 완료</span>
              <span className="tabular-nums text-info">{formatCurrency(paidAmount)}원</span>
            </div>
            {unsettled > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>미정산</span>
                <span className="tabular-nums text-warning">{formatCurrency(unsettled)}원</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 통합 변환 ──────────────────────────────────────────────────

function buildUnifiedTransactions(
  expenses: ExpenseDTO[],
  partnerPayments: PartnerPaymentDTO[]
): UnifiedTransaction[] {
  const unified: UnifiedTransaction[] = [
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
  refetch: () => void;
}

function TransactionList({ projectId, transactions, refetch }: TransactionListProps) {
  const dialog = useDialog();
  const deleteExpense = useDeleteExpense();
  const deletePartnerPayment = useDeletePartnerPayment();
  const updatePartnerPayment = useUpdatePartnerPayment();

  const handleDelete = (tx: UnifiedTransaction) => {
    const labels: Record<TransactionType, string> = {
      expense: "지출 내역",
      partnerPayment: "파트너 지급 내역",
    };
    dialog.confirm({
      title: `${labels[tx.type]} 삭제`,
      description: `이 ${labels[tx.type]}을 삭제하시겠습니까?`,
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        if (tx.type === "expense") {
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
        <li key={`${tx.type}-${tx.id}`} className="group relative py-2.5 px-3 text-sm space-y-0.5 overflow-hidden">
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`size-2 rounded-full shrink-0 ${TYPE_DOT_COLORS[tx.type]}`} />
              <span className="text-muted-foreground text-[11px] shrink-0">{TYPE_LABELS[tx.type]}</span>
              {tx.type === "partnerPayment" && tx.partnerName && (
                <Badge variant="warning-light" className="text-[10px] px-1 py-0">
                  {tx.partnerName}
                </Badge>
              )}
              <span className="truncate font-medium text-xs">{tx.description}</span>
            </div>
            <span className="font-semibold shrink-0 tabular-nums text-destructive text-xs">
              -{formatCurrency(tx.amount)}원
            </span>
          </div>
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">{tx.date}</span>
              {tx.type === "partnerPayment" && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    className="size-3.5 rounded-[3px]"
                    checked={tx.withholdingReported}
                    onCheckedChange={(checked) => handleWithholdingToggle(tx, !!checked)}
                  />
                  <span className="text-[11px] text-muted-foreground">원천세 신고</span>
                </label>
              )}
            </div>
            <nav className="flex items-center -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditTransactionButton
                projectId={projectId}
                transaction={tx}
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

// ── 수정 팝오버 (RHF) ──────────────────────────────────────────

function EditTransactionButton({
  projectId,
  transaction: tx,
  onSuccess,
}: {
  projectId: string;
  transaction: UnifiedTransaction;
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
          onSuccess={() => { setOpen(false); onSuccess(); }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function EditTransactionForm({
  projectId,
  transaction: tx,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  transaction: UnifiedTransaction;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateExpense = useUpdateExpense();
  const updatePartnerPayment = useUpdatePartnerPayment();

  const form = useForm<EditTransactionFormValues>({
    resolver: zodResolver(editTransactionFormSchema) as Resolver<EditTransactionFormValues>,
    defaultValues: {
      description: tx.description,
      amount: tx.amount,
      date: parseISO(tx.date),
    },
  });

  const isPending = tx.type === "expense" ? updateExpense.isPending : updatePartnerPayment.isPending;

  const onSubmit = async (values: EditTransactionFormValues) => {
    if (!values.amount) return;
    const dateStr = format(values.date, "yyyy-MM-dd");
    if (tx.type === "expense") {
      await updateExpense.mutateAsync({
        projectId,
        expenseId: tx.id,
        description: values.description.trim() || undefined,
        amount: values.amount,
        expenseDate: dateStr,
      });
    } else {
      await updatePartnerPayment.mutateAsync({
        projectId,
        partnerPaymentId: tx.id,
        description: values.description.trim() || undefined,
        amount: values.amount,
        paidDate: dateStr,
      });
    }
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <FormTextInput control={form.control} name="description" placeholder="내용 (선택)" disableError />
      <div className="grid grid-cols-2 gap-2">
        <FormNumberInput
          control={form.control}
          name="amount"
          placeholder={tx.type === "partnerPayment" ? "실지급액" : "금액"}
          thousandSeparator
          suffix="원"
          disableError
        />
        <FormDatePicker control={form.control} name="date" mode="single" placeholder="날짜" disableError />
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>취소</Button>
        <LoadingButton type="submit" size="sm" isLoading={isPending}>저장</LoadingButton>
      </div>
    </form>
  );
}

// ── 생성 폼 (RHF) ──────────────────────────────────────────────

interface TransactionFormProps {
  projectId: string;
  projectPartners: ProjectPartnerDTO[];
  onSuccess: () => void;
}

function TransactionForm({ projectId, projectPartners, onSuccess }: TransactionFormProps) {
  const [activeType, setActiveType] = useState<TransactionType>("partnerPayment");

  const createExpense = useCreateExpense();
  const createPartnerPayment = useCreatePartnerPayment();

  const partnerOptions = projectPartners.map((pp) => ({
    value: pp.partnerId,
    label: pp.partner.name,
  }));

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema) as Resolver<TransactionFormValues>,
    defaultValues: {
      description: "",
      amount: undefined,
      date: new Date(),
      partnerId: projectPartners[0]?.partnerId ?? "",
    },
  });

  const isPending = activeType === "expense" ? createExpense.isPending : createPartnerPayment.isPending;

  const onSubmit = async (values: TransactionFormValues) => {
    if (!values.amount) return;
    if (activeType === "partnerPayment" && !values.partnerId) return;

    const dateStr = format(values.date, "yyyy-MM-dd");
    if (activeType === "expense") {
      await createExpense.mutateAsync({
        projectId,
        description: values.description.trim(),
        amount: values.amount,
        expenseDate: dateStr,
      });
    } else {
      await createPartnerPayment.mutateAsync({
        projectId,
        partnerId: values.partnerId,
        description: values.description.trim(),
        amount: values.amount,
        paidDate: dateStr,
      });
    }
    form.reset({ description: "", amount: undefined, date: new Date(), partnerId: values.partnerId });
    onSuccess();
  };

  const typeButtons: { type: TransactionType; label: string }[] = [
    { type: "partnerPayment", label: "파트너지급" },
    { type: "expense", label: "지출" },
  ];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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

      <div className="space-y-2">
        {activeType === "partnerPayment" && partnerOptions.length > 0 && (
          <FormNativeSelect control={form.control} name="partnerId" options={partnerOptions} disableError />
        )}
        <div className="grid grid-cols-2 gap-2">
          <FormTextInput control={form.control} name="description" placeholder="내용 (선택)" disableError />
          <FormNumberInput
            control={form.control}
            name="amount"
            placeholder={activeType === "partnerPayment" ? "실지급액" : "금액"}
            thousandSeparator
            suffix="원"
            disableError
          />
        </div>
        <div className="flex gap-2">
          <FormDatePicker control={form.control} name="date" mode="single" placeholder="날짜" disableError />
          <LoadingButton type="submit" rounded="full" size="sm" isLoading={isPending}>
            추가
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
