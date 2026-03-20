import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { PencilIcon, Trash2Icon, ChevronUpIcon } from "lucide-react";
import { PAYMENT_TYPE_LABELS } from "@packages/types";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { FormNumberInput, FormDatePicker, FormNativeSelect, FormTextInput } from "@/shared/ui/form";
import { DetailSectionTitle } from "../_base/ui";
import { useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useCreateCollection, useUpdateCollection, useDeleteCollection } from "./api";
import type { InvoiceDTO, CollectionDTO } from "./types";

// ── 스키마 ──────────────────────────────────────────────────

const PAYMENT_TYPE_OPTIONS = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const invoiceFormSchema = z.object({
  paymentType: z.string().default("deposit"),
  description: z.string().default(""),
  amount: z.number().optional(),
  issueDate: z.date().default(() => new Date()),
});
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const vatCollectionFormSchema = z.object({
  amount: z.number().optional(),
  paidDate: z.date().default(() => new Date()),
  description: z.string().default(""),
});
type VatCollectionFormValues = z.infer<typeof vatCollectionFormSchema>;

const withholdingCollectionFormSchema = z.object({
  paymentType: z.string().default("deposit"),
  amount: z.number().optional(),
  paidDate: z.date().default(() => new Date()),
  description: z.string().default(""),
});
type WithholdingCollectionFormValues = z.infer<typeof withholdingCollectionFormSchema>;

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

// ── 수금 상태 판단 ─────────────────────────────────────────────

function getCollectionStatus(invoice: InvoiceDTO, collections: CollectionDTO[]) {
  const invoiceCollections = collections.filter((c) => c.invoiceId === invoice.id);
  const collectedAmount = invoiceCollections.reduce((sum, c) => sum + Number(c.amount), 0);
  const invoiceAmount = Number(invoice.amount);
  const remainingAmount = invoiceAmount - collectedAmount;

  if (collectedAmount === 0) return { status: "uncollected" as const, collectedAmount, remainingAmount, invoiceCollections };
  if (collectedAmount < invoiceAmount) return { status: "partial" as const, collectedAmount, remainingAmount, invoiceCollections };
  return { status: "collected" as const, collectedAmount, remainingAmount, invoiceCollections };
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────

interface ProjectInvoiceSectionProps {
  projectId: string;
  invoices: InvoiceDTO[];
  collections: CollectionDTO[];
  contractAmount: number;
  taxType: string | null;
  refetch: () => void;
}

export function ProjectInvoiceSection({
  projectId,
  invoices,
  collections,
  contractAmount,
  taxType,
  refetch,
}: ProjectInvoiceSectionProps) {
  if (taxType === "withholding") {
    return (
      <WithholdingCollectionView
        projectId={projectId}
        collections={collections}
        contractAmount={contractAmount}
        refetch={refetch}
      />
    );
  }

  return (
    <VatInvoiceView
      projectId={projectId}
      invoices={invoices}
      collections={collections}
      contractAmount={contractAmount}
      refetch={refetch}
    />
  );
}

// ══════════════════════════════════════════════════════════════
// VAT 모드: 세금계산서 + 수금
// ══════════════════════════════════════════════════════════════

function VatInvoiceView({
  projectId,
  invoices,
  collections,
  contractAmount,
  refetch,
}: {
  projectId: string;
  invoices: InvoiceDTO[];
  collections: CollectionDTO[];
  contractAmount: number;
  refetch: () => void;
}) {
  const totalWithVat = contractAmount * 1.1;
  const issuedAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const remainingToIssue = totalWithVat - issuedAmount;

  const totalCollected = collections
    .filter((c) => c.invoiceId !== null)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div>
      <DetailSectionTitle>세금계산서 / 수금</DetailSectionTitle>

      {/* 발행 현황 요약 */}
      <div className="rounded-lg border bg-muted/30 p-3 mb-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">총 계약금액(VAT포함)</span>
          <span className="font-semibold tabular-nums">{formatCurrency(totalWithVat)}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">발행 완료</span>
          <span className="font-medium tabular-nums text-info">{formatCurrency(issuedAmount)}원</span>
        </div>
        {remainingToIssue > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">미발행</span>
            <span className="font-medium tabular-nums text-warning">{formatCurrency(remainingToIssue)}원</span>
          </div>
        )}
        <ProgressBar current={issuedAmount} total={totalWithVat} />
        {invoices.length > 0 && (
          <div className="flex justify-between pt-1 border-t border-border/50">
            <span className="text-muted-foreground">수금 합계</span>
            <span className="font-medium tabular-nums text-info">{formatCurrency(totalCollected)}원</span>
          </div>
        )}
      </div>

      <InvoiceForm projectId={projectId} onSuccess={refetch} />

      {invoices.length === 0 ? (
        <InlineEmpty message="발행된 세금계산서가 없습니다." />
      ) : (
        <InvoiceList projectId={projectId} invoices={invoices} collections={collections} refetch={refetch} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 원천징수 모드: 수금 전용 뷰
// ══════════════════════════════════════════════════════════════

function WithholdingCollectionView({
  projectId,
  collections,
  contractAmount,
  refetch,
}: {
  projectId: string;
  collections: CollectionDTO[];
  contractAmount: number;
  refetch: () => void;
}) {
  const withholdingTax = contractAmount * 0.033;
  const netAmount = contractAmount - withholdingTax;
  const collectedAmount = collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const remainingAmount = netAmount - collectedAmount;

  return (
    <div>
      <DetailSectionTitle>수금</DetailSectionTitle>

      <div className="rounded-lg border bg-muted/30 p-3 mb-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">계약금액</span>
          <span className="font-semibold tabular-nums">{formatCurrency(contractAmount)}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">원천세(3.3%)</span>
          <span className="font-medium tabular-nums text-destructive">-{formatCurrency(withholdingTax)}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">실수령액</span>
          <span className="font-semibold tabular-nums">{formatCurrency(netAmount)}원</span>
        </div>
        <ProgressBar current={collectedAmount} total={netAmount} />
        <div className="flex justify-between pt-1 border-t border-border/50">
          <span className="text-muted-foreground">수금 완료</span>
          <span className="font-medium tabular-nums text-info">{formatCurrency(collectedAmount)}원</span>
        </div>
        {remainingAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">잔금</span>
            <span className="font-medium tabular-nums text-warning">{formatCurrency(remainingAmount)}원</span>
          </div>
        )}
      </div>

      <WithholdingCollectionForm projectId={projectId} onSuccess={refetch} />

      {collections.length === 0 ? (
        <InlineEmpty message="아직 수금 내역이 없습니다." />
      ) : (
        <WithholdingCollectionList projectId={projectId} collections={collections} refetch={refetch} />
      )}
    </div>
  );
}

// ── 원천징수 수금 등록 폼 (RHF) ──────────────────────────────────

function WithholdingCollectionForm({
  projectId,
  onSuccess,
}: {
  projectId: string;
  onSuccess: () => void;
}) {
  const createCollection = useCreateCollection();

  const form = useForm<WithholdingCollectionFormValues>({
    resolver: zodResolver(withholdingCollectionFormSchema) as Resolver<WithholdingCollectionFormValues>,
    defaultValues: { paymentType: "deposit", description: "", amount: undefined, paidDate: new Date() },
  });

  const onSubmit = async (values: WithholdingCollectionFormValues) => {
    if (!values.amount) return;
    await createCollection.mutateAsync({
      projectId,
      description: values.description.trim(),
      amount: values.amount,
      paidDate: format(values.paidDate, "yyyy-MM-dd"),
      paymentType: values.paymentType as "deposit" | "interim" | "balance" | "additional",
    });
    form.reset({ paymentType: "deposit", description: "", amount: undefined, paidDate: new Date() });
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 mb-3">
      <div className="grid grid-cols-2 gap-2">
        <FormNativeSelect control={form.control} name="paymentType" options={PAYMENT_TYPE_OPTIONS} disableError />
        <FormNumberInput control={form.control} name="amount" placeholder="실수령액" thousandSeparator suffix="원" disableError />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormTextInput control={form.control} name="description" placeholder="내용 (선택)" disableError />
        <div className="flex gap-2">
          <FormDatePicker control={form.control} name="paidDate" mode="single" placeholder="수금일" disableError />
          <LoadingButton type="submit" rounded="full" size="sm" isLoading={createCollection.isPending}>
            추가
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}

// ── 원천징수 수금 목록 ────────────────────────────────────────────

function WithholdingCollectionList({
  projectId,
  collections,
  refetch,
}: {
  projectId: string;
  collections: CollectionDTO[];
  refetch: () => void;
}) {
  const dialog = useDialog();
  const deleteCollection = useDeleteCollection();

  const handleDelete = (col: CollectionDTO) => {
    dialog.confirm({
      title: "수금 내역 삭제",
      description: "이 수금 내역을 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteCollection.mutateAsync({ projectId, collectionId: col.id });
        refetch();
      },
    });
  };

  const sorted = [...collections].sort((a, b) => a.paidDate.localeCompare(b.paidDate));

  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {sorted.map((col) => (
        <li key={col.id} className="group relative py-2.5 px-3 text-sm space-y-0.5 overflow-hidden">
          <div className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="muted" className="text-[10px] px-1.5 py-0">
                {PAYMENT_TYPE_LABELS[col.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
              </Badge>
              <span className="truncate text-xs">{col.description || "수금"}</span>
            </div>
            <span className="font-semibold shrink-0 tabular-nums text-info text-xs">
              {formatCurrency(Number(col.amount))}원
            </span>
          </div>
          <div className="flex items-center justify-between gap-x-2">
            <span className="text-muted-foreground text-xs">{col.paidDate}</span>
            <nav className="flex items-center -mb-1 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditCollectionButton projectId={projectId} collection={col} onSuccess={refetch} />
              <Button type="button" size="icon-xs" variant="ghost" onClick={() => handleDelete(col)}>
                <Trash2Icon className="size-3" />
              </Button>
            </nav>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ══════════════════════════════════════════════════════════════
// 세금계산서 발행 폼 (VAT, RHF)
// ══════════════════════════════════════════════════════════════

function InvoiceForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const createInvoice = useCreateInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as Resolver<InvoiceFormValues>,
    defaultValues: { paymentType: "deposit", description: "", amount: undefined, issueDate: new Date() },
  });

  const onSubmit = async (values: InvoiceFormValues) => {
    if (!values.amount) return;
    await createInvoice.mutateAsync({
      projectId,
      paymentType: values.paymentType as "deposit" | "interim" | "balance" | "additional",
      description: values.description.trim(),
      amount: values.amount,
      issueDate: format(values.issueDate, "yyyy-MM-dd"),
    });
    form.reset({ paymentType: "deposit", description: "", amount: undefined, issueDate: new Date() });
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 mb-3">
      <div className="grid grid-cols-2 gap-2">
        <FormNativeSelect control={form.control} name="paymentType" options={PAYMENT_TYPE_OPTIONS} disableError />
        <FormNumberInput control={form.control} name="amount" placeholder="VAT 포함" thousandSeparator suffix="원" disableError />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormTextInput control={form.control} name="description" placeholder="내용 (선택)" disableError />
        <div className="flex gap-2">
          <FormDatePicker control={form.control} name="issueDate" mode="single" placeholder="발행일" disableError />
          <LoadingButton type="submit" rounded="full" size="sm" isLoading={createInvoice.isPending}>
            발행
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════
// 세금계산서 목록 (VAT) — 수금 진행바 + 인라인 수금 폼
// ══════════════════════════════════════════════════════════════

function InvoiceList({
  projectId,
  invoices,
  collections,
  refetch,
}: {
  projectId: string;
  invoices: InvoiceDTO[];
  collections: CollectionDTO[];
  refetch: () => void;
}) {
  const dialog = useDialog();
  const deleteInvoice = useDeleteInvoice();
  const deleteCollection = useDeleteCollection();

  const handleDeleteInvoice = (invoice: InvoiceDTO) => {
    dialog.confirm({
      title: "세금계산서 삭제",
      description: "이 세금계산서를 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteInvoice.mutateAsync({ projectId, invoiceId: invoice.id });
        refetch();
      },
    });
  };

  const handleDeleteCollection = (collection: CollectionDTO) => {
    dialog.confirm({
      title: "수금 내역 삭제",
      description: "이 수금 내역을 삭제하시겠습니까?",
      variant: "destructive",
      confirmText: "삭제",
      onConfirm: async () => {
        await deleteCollection.mutateAsync({ projectId, collectionId: collection.id });
        refetch();
      },
    });
  };

  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {invoices.map((inv) => (
        <InvoiceCard
          key={inv.id}
          projectId={projectId}
          invoice={inv}
          collections={collections}
          onDeleteInvoice={() => handleDeleteInvoice(inv)}
          onDeleteCollection={handleDeleteCollection}
          refetch={refetch}
        />
      ))}
    </ul>
  );
}

function InvoiceCard({
  projectId,
  invoice: inv,
  collections,
  onDeleteInvoice,
  onDeleteCollection,
  refetch,
}: {
  projectId: string;
  invoice: InvoiceDTO;
  collections: CollectionDTO[];
  onDeleteInvoice: () => void;
  onDeleteCollection: (col: CollectionDTO) => void;
  refetch: () => void;
}) {
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const { status, collectedAmount, remainingAmount, invoiceCollections } = getCollectionStatus(inv, collections);
  const invoiceAmount = Number(inv.amount);

  return (
    <li className="group relative py-3 px-3 text-sm space-y-1.5 overflow-hidden">
      <div className="flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="muted" className="text-[10px] px-1.5 py-0">
            {PAYMENT_TYPE_LABELS[inv.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
          </Badge>
          <span className="truncate font-medium text-xs">{inv.description || "세금계산서"}</span>
        </div>
        <span className="font-semibold shrink-0 tabular-nums text-info text-xs">
          {formatCurrency(invoiceAmount)}원
        </span>
      </div>

      <div className="flex items-center justify-between gap-x-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">발행 {inv.issueDate}</span>
          {status === "collected" && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">수금 완료</Badge>
          )}
          {status === "partial" && (
            <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">부분 수금</Badge>
          )}
          {status === "uncollected" && (
            <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">미수금</Badge>
          )}
        </div>
        <nav className="flex items-center -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <EditInvoiceButton projectId={projectId} invoice={inv} onSuccess={refetch} />
          <Button type="button" size="icon-xs" variant="ghost" onClick={onDeleteInvoice}>
            <Trash2Icon className="size-3" />
          </Button>
        </nav>
      </div>

      <div className="space-y-0.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>수금 {formatCurrency(collectedAmount)}원 / {formatCurrency(invoiceAmount)}원</span>
        </div>
        <ProgressBar current={collectedAmount} total={invoiceAmount} />
      </div>

      {invoiceCollections.length > 0 && (
        <div className="pl-3 border-l-2 border-muted space-y-1">
          {invoiceCollections.map((col) => (
            <div key={col.id} className="group/col flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span>{col.paidDate}</span>
                {col.description && <span className="truncate max-w-[100px]">{col.description}</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className="tabular-nums text-info">{formatCurrency(Number(col.amount))}원</span>
                <EditCollectionButton projectId={projectId} collection={col} onSuccess={refetch} />
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="opacity-0 group-hover/col:opacity-100 transition-opacity"
                  onClick={() => onDeleteCollection(col)}
                >
                  <Trash2Icon className="size-2.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {status !== "collected" && (
        <div>
          {!showCollectionForm ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="w-full text-xs"
              onClick={() => setShowCollectionForm(true)}
            >
              수금 등록
            </Button>
          ) : (
            <InlineCollectionForm
              projectId={projectId}
              invoice={inv}
              remainingAmount={remainingAmount}
              onSuccess={() => {
                setShowCollectionForm(false);
                refetch();
              }}
              onCancel={() => setShowCollectionForm(false)}
            />
          )}
        </div>
      )}
    </li>
  );
}

// ── 인라인 수금 등록 폼 (RHF) ────────────────────────────────────

function InlineCollectionForm({
  projectId,
  invoice,
  remainingAmount,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  invoice: InvoiceDTO;
  remainingAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createCollection = useCreateCollection();

  const form = useForm<VatCollectionFormValues>({
    resolver: zodResolver(vatCollectionFormSchema) as Resolver<VatCollectionFormValues>,
    defaultValues: {
      amount: remainingAmount > 0 ? remainingAmount : undefined,
      paidDate: new Date(),
      description: "",
    },
  });

  const onSubmit = async (values: VatCollectionFormValues) => {
    if (!values.amount) return;
    await createCollection.mutateAsync({
      projectId,
      invoiceId: invoice.id,
      description: values.description.trim(),
      amount: values.amount,
      paidDate: format(values.paidDate, "yyyy-MM-dd"),
      paymentType: invoice.paymentType as "deposit" | "interim" | "balance" | "additional",
    });
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-md border bg-muted/20 p-2.5 space-y-2">
      <p className="text-[11px] text-muted-foreground flex justify-between">
        <span>수금 등록</span>
        <button type="button" onClick={onCancel} className="hover:text-foreground">
          <ChevronUpIcon className="size-3" />
        </button>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <FormNumberInput control={form.control} name="amount" placeholder="수금 금액" thousandSeparator suffix="원" disableError />
        <FormDatePicker control={form.control} name="paidDate" mode="single" placeholder="수금일" disableError />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <FormTextInput control={form.control} name="description" placeholder="메모 (선택)" disableError />
        </div>
        <LoadingButton type="submit" size="sm" isLoading={createCollection.isPending}>
          등록
        </LoadingButton>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════
// 수정 팝오버 (세금계산서 / 수금) — RHF
// ══════════════════════════════════════════════════════════════

function EditInvoiceButton({
  projectId,
  invoice,
  onSuccess,
}: {
  projectId: string;
  invoice: InvoiceDTO;
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
        <EditInvoiceForm
          projectId={projectId}
          invoice={invoice}
          onSuccess={() => { setOpen(false); onSuccess(); }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function EditInvoiceForm({
  projectId,
  invoice,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  invoice: InvoiceDTO;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateInvoice = useUpdateInvoice();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as Resolver<InvoiceFormValues>,
    defaultValues: {
      paymentType: invoice.paymentType,
      description: invoice.description,
      amount: Number(invoice.amount),
      issueDate: parseISO(invoice.issueDate),
    },
  });

  const onSubmit = async (values: InvoiceFormValues) => {
    if (!values.amount) return;
    await updateInvoice.mutateAsync({
      projectId,
      invoiceId: invoice.id,
      paymentType: values.paymentType,
      description: values.description.trim(),
      amount: values.amount,
      issueDate: format(values.issueDate, "yyyy-MM-dd"),
    });
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <FormNativeSelect control={form.control} name="paymentType" options={PAYMENT_TYPE_OPTIONS} disableError />
      <FormTextInput control={form.control} name="description" placeholder="내용 (선택)" disableError />
      <div className="grid grid-cols-2 gap-2">
        <FormNumberInput control={form.control} name="amount" placeholder="VAT 포함" thousandSeparator suffix="원" disableError />
        <FormDatePicker control={form.control} name="issueDate" mode="single" placeholder="발행일" disableError />
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>취소</Button>
        <LoadingButton type="submit" size="sm" isLoading={updateInvoice.isPending}>저장</LoadingButton>
      </div>
    </form>
  );
}

function EditCollectionButton({
  projectId,
  collection,
  onSuccess,
}: {
  projectId: string;
  collection: CollectionDTO;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover/col:opacity-100 transition-opacity"
        >
          <PencilIcon className="size-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <EditCollectionForm
          projectId={projectId}
          collection={collection}
          onSuccess={() => { setOpen(false); onSuccess(); }}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function EditCollectionForm({
  projectId,
  collection,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  collection: CollectionDTO;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updateCollection = useUpdateCollection();

  const form = useForm<VatCollectionFormValues>({
    resolver: zodResolver(vatCollectionFormSchema) as Resolver<VatCollectionFormValues>,
    defaultValues: {
      amount: Number(collection.amount),
      paidDate: parseISO(collection.paidDate),
      description: collection.description ?? "",
    },
  });

  const onSubmit = async (values: VatCollectionFormValues) => {
    if (!values.amount) return;
    await updateCollection.mutateAsync({
      projectId,
      collectionId: collection.id,
      description: values.description.trim() || undefined,
      amount: values.amount,
      paidDate: format(values.paidDate, "yyyy-MM-dd"),
      paymentType: collection.paymentType,
    });
    onSuccess();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <FormNumberInput control={form.control} name="amount" placeholder="수금 금액" thousandSeparator suffix="원" disableError />
      <FormDatePicker control={form.control} name="paidDate" mode="single" placeholder="수금일" disableError />
      <FormTextInput control={form.control} name="description" placeholder="메모 (선택)" disableError />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>취소</Button>
        <LoadingButton type="submit" size="sm" isLoading={updateCollection.isPending}>저장</LoadingButton>
      </div>
    </form>
  );
}
