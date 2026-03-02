import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon, FileTextIcon, LoaderIcon, XIcon } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/shared/utils/classnames";
import { formatCurrency } from "@/shared/utils/format";
import { SheetFooter, SheetBody, SheetContainer, SheetScrollColumn } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import {
  FormTextInput,
  FormNumberInput,
  FormDatePicker,
} from "@/shared/ui/form";
import { useDialog } from "@/shared/ui/app-dialog";
import {
  DetailSectionTitle,
  DetailInfoRow,
  ManageSheetClose,
  ManageSheetModeChange,
  MemoSection,
  useManageSheetData,
} from "../_base/ui";
import { calculateTaxBreakdown } from "@packages/utils";
import {
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useCreateProjectMemo,
  useUpdateProjectMemo,
  useDeleteProjectMemo,
} from "./api";
import {
  fetchEstimate,
  useGetVersions,
  useUpdateFinalVersion,
} from "../estimates/api";
import { EstimatePdfPreview } from "../estimates/pdf/estimate-pdf-preview";
import type { EstimateWithDetails } from "../estimates/types";
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

  const isWithholding = taxType === "withholding";
  const isVat = taxType === "vat";

  const { supplyAmount, taxAmount, taxLabel } = calculateTaxBreakdown(contractAmount, taxType ?? "");

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
            showDivider={false}
            items={[
              { label: "입금", value: formatCurrency(vatPaid), variant: "positive" },
              { label: "잔금", value: formatCurrency(vatRemaining) },
            ]}
          />
        </AmountRow>
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

// ── 견적서 버전 ──────────────────────────────────────────────

interface EstimateVersionsProps {
  estimateNumber: string;
}

function EstimateVersions({ estimateNumber }: EstimateVersionsProps) {
  const { data: versions = [], refetch } = useGetVersions(estimateNumber);
  const updateFinalVersion = useUpdateFinalVersion();
  const [isUpdating, setIsUpdating] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfData, setPdfData] = useState<EstimateWithDetails | null>(null);
  const [pdfLabel, setPdfLabel] = useState("");
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  if (versions.length === 0) return null;

  async function handleSetFinalVersion(estimateId: string) {
    setIsUpdating(true);
    try {
      await updateFinalVersion.mutateAsync({ estimateNumber, finalEstimateId: estimateId });
      refetch();
    } catch {
      toast.error("계약 버전 변경에 실패했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleOpenPdf(
    estimateId: string,
    version: number,
    versionLabel: string | null
  ) {
    setIsLoadingPdf(true);
    setPdfLabel(versionLabel || `v${version}`);
    setPdfOpen(true);
    try {
      const data = await fetchEstimate(estimateId);
      setPdfData(data);
    } catch {
      toast.error("견적서 데이터를 불러오지 못했습니다.");
      setPdfOpen(false);
    } finally {
      setIsLoadingPdf(false);
    }
  }

  return (
    <div>
      <DetailSectionTitle>견적서 버전</DetailSectionTitle>
      <ul>
        {versions.map((rev, index) => {
          const isFinal = rev.isFinal;
          const isFirst = index === 0;
          const isLast = index === versions.length - 1;

          return (
            <li
              key={rev.id}
              className="group flex cursor-pointer"
              onClick={() => handleOpenPdf(rev.id, rev.version, rev.versionLabel ?? null)}
            >
              {/* 타임라인 트랙 */}
              <div className="flex flex-col items-center w-6 shrink-0 mr-3">
                <div className={cn("w-px flex-1", isFirst ? "bg-transparent" : "bg-border dark:bg-border-dark")} />
                {isFinal ? (
                  <div className="shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="size-2.5 rounded-full bg-primary" />
                  </div>
                ) : (
                  <div className="shrink-0 size-3 rounded-full border-2 border-border dark:border-border-dark bg-background" />
                )}
                <div className={cn("w-px flex-1", isLast ? "bg-transparent" : "bg-border dark:bg-border-dark")} />
              </div>

              {/* 컨텐츠 카드 */}
              <div className={cn("flex-1 min-w-0 flex items-center gap-3 my-0.5 p-3 rounded-xl transition-colors", "hover:bg-accent/50")}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      v{rev.version}
                    </span>
                    <span className="truncate font-medium text-sm">
                      {rev.versionLabel ?? "버전명 없음"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rev.issuedDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(rev.issuedDate, "yyyy-MM-dd")} 발행
                      </span>
                    )}
                    {isFinal && (
                      <Badge variant="default-light" className="text-[10px] leading-none px-1.5 py-0.5 shrink-0">
                        계약
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <ButtonGroup className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPdf(rev.id, rev.version, rev.versionLabel ?? null);
                    }}
                  >
                    <FileTextIcon />
                  </Button>
                  {!isFinal && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetFinalVersion(rev.id);
                      }}
                    >
                      계약 지정
                    </Button>
                  )}
                </ButtonGroup>
              </div>
            </li>
          );
        })}
      </ul>

      {/* PDF 미리보기 다이얼로그 */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-7xl w-[95vw] h-[92dvh] grid! grid-rows-[auto_1fr] gap-0 p-0 rounded-2xl overflow-hidden!">
          <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b">
            <div className="shrink-0 size-10 rounded-lg bg-primary-light flex items-center justify-center">
              <FileTextIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">견적서 미리보기</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {pdfLabel}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="black" size="icon-sm" className="shrink-0 rounded-full">
                <XIcon className="size-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          {isLoadingPdf || !pdfData ? (
            <div className="flex items-center justify-center">
              <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="min-h-0 flex flex-col">
              <EstimatePdfPreview estimate={pdfData} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
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
  const dialog = useDialog();
  const deletePayment = useDeletePayment();

  const handleDelete = (paymentId: string) => {
    dialog.confirm({
      title: "입금 내역 삭제",
      description: "이 입금 내역을 삭제하시겠습니까?",
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
                <Trash2Icon className="size-3" />
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
            <DetailInfoRow label="납품일" value={data.deliveredDate} />
            <DetailInfoRow label="완료일" value={data.completedDate} />
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

        {/* 우측: 견적서 버전 + 메모 */}
        <SheetScrollColumn>
          {data.estimateNumber && (
            <SheetContainer>
              <EstimateVersions estimateNumber={data.estimateNumber} />
            </SheetContainer>
          )}
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
