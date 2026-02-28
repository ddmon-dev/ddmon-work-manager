import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import {
  FormTextInput,
  FormNumberInput,
  FormDatePicker,
} from "@/shared/ui/form";
import { useConfirm } from "@/shared/ui/confirm-dialog";
import {
  DetailSectionTitle,
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
  useManageSheetData,
} from "../_base/ui";
import {
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useCreateProjectMemo,
  useUpdateProjectMemo,
  useDeleteProjectMemo,
} from "./api";
import { TAX_TYPE_OPTIONS } from "./config";
import { StatusBadge } from "./status-badge";
import { WorkPhaseIndicator } from "./work-phase-indicator";
import type { ProjectWithDetails, PaymentDTO } from "./types";

// ── 헤더 ────────────────────────────────────────────────────

export function ProjectDetailHeader() {
  const { prevValues: data } = useManageSheetData<ProjectWithDetails>();
  if (!data) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{data.name}</h2>
      {data.description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {data.description}
        </p>
      )}
    </div>
  );
}

// ── 금액 요약 ────────────────────────────────────────────────

interface PriceSummariesProps {
  payments: PaymentDTO[];
  contractAmount: number;
  taxType: string | null;
}

function PriceSummaries({ payments, contractAmount, taxType }: PriceSummariesProps) {
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = contractAmount - totalPaid;

  const isInclusive = taxType === "inclusive";
  const isExclusive = taxType === "exclusive";

  const supplyAmount = isInclusive ? Math.round(contractAmount / 1.1) : contractAmount;
  const taxAmount = isInclusive
    ? contractAmount - supplyAmount
    : isExclusive
    ? Math.round(contractAmount * 0.1)
    : 0;

  return (
    <div className="space-y-2">
      <AmountRow
        label="계약금액"
        value={formatCurrency(contractAmount)}
      >
        {(isInclusive || isExclusive) && (
          <AmountDetails
            items={[
              { label: "공급가액", value: formatCurrency(supplyAmount) },
              { label: "부가세", value: formatCurrency(taxAmount) },
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
    </div>
  );
}

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

function AmountDetails({ items }: { items: { label: string; value: string }[] }) {
  return (
    <>
      <div className="relative space-y-0.5">
        {items.map((item, i) => (
          <AmountRow key={i} label={item.label} value={item.value} isDetail />
        ))}
      </div>
      <Divider />
    </>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-border" />;
}

// ── 수금 폼 ──────────────────────────────────────────────────

const paymentFormSchema = z.object({
  description: z.string().min(1, "입금 내용을 입력해주세요."),
  amount: z.number({ required_error: "금액을 입력해주세요." }).min(1, "금액을 입력해주세요."),
  paidDate: z.date({ required_error: "입금일을 선택해주세요." }),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  projectId: string;
  payment?: Pick<PaymentDTO, "id" | "description" | "amount" | "paidDate">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function PaymentForm({ projectId, payment, onSuccess, onCancel }: PaymentFormProps) {
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      description: payment?.description ?? "",
      amount: payment ? Number(payment.amount) : undefined,
      paidDate: payment?.paidDate ? new Date(payment.paidDate) : new Date(),
    },
  });

  const handleSubmit = async (values: PaymentFormValues) => {
    const paidDate = format(values.paidDate, "yyyy-MM-dd");
    if (payment) {
      await updatePayment.mutateAsync({
        projectId,
        paymentId: payment.id,
        description: values.description.trim(),
        amount: values.amount,
        paidDate,
      });
    } else {
      await createPayment.mutateAsync({
        projectId,
        description: values.description.trim(),
        amount: values.amount,
        paidDate,
      });
      form.reset({ description: "", amount: undefined, paidDate: new Date() });
    }
    onSuccess?.();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3!">
        <div className="grid grid-cols-[2fr_1.5fr] gap-2">
          <div className="col-span-2">
            <FormTextInput
              control={form.control}
              name="description"
              placeholder="입금 내용"
              disableError
            />
          </div>
          <FormNumberInput
            control={form.control}
            name="amount"
            placeholder="금액"
            thousandSeparator
            suffix="원"
            disableError
          />
          <FormDatePicker
            control={form.control}
            name="paidDate"
            placeholder="입금일"
            disableError
          />
        </div>
        {payment ? (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              취소
            </Button>
            <LoadingButton type="submit" size="sm" isLoading={form.formState.isSubmitting}>
              저장
            </LoadingButton>
          </div>
        ) : (
          <LoadingButton type="submit" isLoading={form.formState.isSubmitting} size="sm">
            입금 내역 추가
          </LoadingButton>
        )}
      </form>
    </FormProvider>
  );
}

// ── 수금 내역 ────────────────────────────────────────────────

interface PaymentHistoryProps {
  projectId: string;
  payments: PaymentDTO[];
  refetch: () => void;
}

function PaymentHistory({ projectId, payments, refetch }: PaymentHistoryProps) {
  const { confirm } = useConfirm();
  const deletePayment = useDeletePayment();

  const handleDelete = (paymentId: string) => {
    confirm({
      title: "수금 삭제",
      description: "이 수금 내역을 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deletePayment.mutateAsync({ projectId, paymentId });
        refetch();
      },
    });
  };

  if (payments.length === 0) {
    return (
      <ul className="border rounded-lg">
        <li className="py-6 text-center text-sm text-muted-foreground">
          아직 입금 내역이 없습니다.
        </li>
      </ul>
    );
  }

  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {payments.map((payment) => (
        <li key={payment.id} className="group relative py-4 px-4 text-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between gap-x-8">
            <span className="truncate font-medium">{payment.description}</span>
            <span className="font-semibold ml-auto shrink-0 text-info">
              {formatCurrency(Number(payment.amount))}원
            </span>
          </div>
          <div className="flex items-end justify-between gap-x-2">
            <span className="text-muted-foreground text-xs">{payment.paidDate}</span>
            <nav className="flex items-center -mb-1.5 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditPaymentButton projectId={projectId} payment={payment} onSuccess={refetch} />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => handleDelete(payment.id)}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
            </nav>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EditPaymentButton({
  projectId,
  payment,
  onSuccess,
}: {
  projectId: string;
  payment: PaymentDTO;
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
        <PaymentForm
          projectId={projectId}
          payment={payment}
          onSuccess={() => { setOpen(false); onSuccess(); }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── 상세 보기 ────────────────────────────────────────────────

interface DetailViewProps {
  data: ProjectWithDetails;
  refetch: () => void;
}

export function DetailView({ data, refetch }: DetailViewProps) {
  const createMemo = useCreateProjectMemo();
  const updateMemo = useUpdateProjectMemo();
  const deleteMemo = useDeleteProjectMemo();

  const handleAddMemo = async (content: string) => {
    await createMemo.mutateAsync({ projectId: data.id, content });
    refetch();
  };

  const handleUpdateMemo = async (memoId: string, content: string) => {
    await updateMemo.mutateAsync({ projectId: data.id, memoId, content });
    refetch();
  };

  const handleDeleteMemo = async (memoId: string) => {
    await deleteMemo.mutateAsync({ projectId: data.id, memoId });
    refetch();
  };

  const contractAmount = data.contractAmount ? Number(data.contractAmount) : 0;

  return (
    <>
      <SheetBody className="lg:grid-cols-[2.5fr_3fr]">
        {/* 좌측 */}
        <SheetScrollColumn className="flex flex-col">
          {/* 프로젝트 정보 */}
          <SheetContainer>
            <DetailInfoRow label="프로젝트 번호" value={data.projectNumber} />
            <DetailInfoRow label="고객" value={data.client?.companyName} />
            {data.estimateNumber && (
              <DetailInfoRow label="견적서 번호" value={data.estimateNumber} />
            )}
            <DetailInfoRow
              label="상태"
              value={<StatusBadge projectId={data.id} status={data.status} />}
            />
            <DetailInfoRow
              label="작업단계"
              value={<WorkPhaseIndicator projectId={data.id} workPhase={data.workPhase} />}
            />
            <DetailInfoRow label="계약일" value={data.contractDate} />
            {data.deliveredDate && (
              <DetailInfoRow label="납품일" value={data.deliveredDate} />
            )}
            {data.completedDate && (
              <DetailInfoRow label="완료일" value={data.completedDate} />
            )}
          </SheetContainer>

          {/* 비고 */}
          {data.notes && (
            <SheetContainer>
              <DetailInfoRow label="비고" value={data.notes} vertical />
            </SheetContainer>
          )}

          {/* 금액 요약 */}
          {contractAmount > 0 && (
            <SheetContainer>
              <PriceSummaries
                payments={data.payments}
                contractAmount={contractAmount}
                taxType={data.taxType}
              />
            </SheetContainer>
          )}

          {/* 입금 내역 */}
          <SheetContainer className="border-b-0!">
            <DetailSectionTitle>입금 내역</DetailSectionTitle>
            <PaymentHistory projectId={data.id} payments={data.payments} refetch={refetch} />
          </SheetContainer>
          <SheetContainer className="sticky bottom-0 border-t border-border-dark/50 bg-background/60 backdrop-blur-md">
            <PaymentForm projectId={data.id} onSuccess={refetch} />
          </SheetContainer>
        </SheetScrollColumn>

        {/* 우측: 메모 */}
        <SheetScrollColumn>
          <SheetContainer>
            <MemoSection
              memos={data.memos}
              onAdd={handleAddMemo}
              onUpdate={handleUpdateMemo}
              onDelete={handleDeleteMemo}
            />
          </SheetContainer>
        </SheetScrollColumn>
      </SheetBody>

      <SheetFooter>
        <ManageSheetClose />
        <ManageSheetModeChange mode="modify" />
      </SheetFooter>
    </>
  );
}
