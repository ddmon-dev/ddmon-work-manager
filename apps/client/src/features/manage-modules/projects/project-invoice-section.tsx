import { useState } from "react";
import { format, parseISO } from "date-fns";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { PAYMENT_TYPE_LABELS } from "@packages/types";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { DatePicker } from "@/shared/ui/date-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { DetailSectionTitle } from "../_base/ui";
import { useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useCreateCollection, useDeleteCollection } from "./api";
import type { InvoiceDTO, CollectionDTO } from "./types";

// ── 금액 입력 ────────────────────────────────────────────────

function toDisplay(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "";
  return value.toLocaleString("ko-KR");
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
  const [display, setDisplay] = useState(() => toDisplay(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,\-]/g, "");
    setDisplay(raw);
    const num = parseRawInput(raw);
    onChange(num || undefined);
  };

  const handleBlur = () => setDisplay(toDisplay(value));

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
  refetch: () => void;
}

export function ProjectInvoiceSection({ projectId, invoices, collections, refetch }: ProjectInvoiceSectionProps) {
  const uncollectedCount = invoices.filter((i) => {
    const { status } = getCollectionStatus(i, collections);
    return status !== "collected";
  }).length;
  const uncollectedTotal = invoices.reduce((sum, i) => {
    const { remainingAmount } = getCollectionStatus(i, collections);
    return sum + Math.max(remainingAmount, 0);
  }, 0);

  return (
    <div>
      <DetailSectionTitle>세금계산서</DetailSectionTitle>
      <InvoiceForm projectId={projectId} onSuccess={refetch} />
      {invoices.length === 0 ? (
        <InlineEmpty message="발행된 세금계산서가 없습니다." />
      ) : (
        <>
          <InvoiceList projectId={projectId} invoices={invoices} collections={collections} refetch={refetch} />
          {uncollectedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              미수금 {uncollectedCount}건 / {formatCurrency(uncollectedTotal)}원
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── 발행 폼 ────────────────────────────────────────────────────

function InvoiceForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const [paymentType, setPaymentType] = useState("deposit");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInvoice = useCreateInvoice();

  const handleSubmit = async () => {
    if (!amount || !issueDate) return;
    setIsSubmitting(true);
    try {
      await createInvoice.mutateAsync({
        projectId,
        paymentType: paymentType as "deposit" | "interim" | "balance" | "additional",
        description: description.trim(),
        amount,
        issueDate: format(issueDate, "yyyy-MM-dd"),
      });
      setDescription("");
      setAmount(undefined);
      setIssueDate(new Date());
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-2 items-start mb-3">
      <NativeSelect value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
        {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
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
        placeholder="VAT 포함"
        className="w-32"
      />
      <DatePicker
        mode="single"
        value={issueDate}
        onValueChange={(d) => d && setIssueDate(d)}
        placeholder="발행일"
      />
      <LoadingButton rounded="full" isLoading={isSubmitting} onClick={handleSubmit}>
        발행
      </LoadingButton>
    </div>
  );
}

// ── 발행 목록 ────────────────────────────────────────────────────

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
      {invoices.map((inv) => {
        const { status, collectedAmount, remainingAmount, invoiceCollections } = getCollectionStatus(inv, collections);

        return (
          <li key={inv.id} className="group relative py-3 px-4 text-sm space-y-1 overflow-hidden">
            <div className="flex items-center justify-between gap-x-4">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">
                  {PAYMENT_TYPE_LABELS[inv.paymentType as keyof typeof PAYMENT_TYPE_LABELS]}
                </Badge>
                <span className="truncate font-medium">{inv.description || "세금계산서"}</span>
              </div>
              <span className="font-semibold shrink-0 tabular-nums text-info">
                {formatCurrency(Number(inv.amount))}원
              </span>
            </div>
            <div className="flex items-center justify-between gap-x-2">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">발행 {inv.issueDate}</span>
                {status === "collected" && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">수금 완료</Badge>
                )}
                {status === "partial" && (
                  <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">
                    부분 수금 {formatCurrency(collectedAmount)}원
                  </Badge>
                )}
                {status === "uncollected" && (
                  <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">미수금</Badge>
                )}
              </div>
              <nav className="flex items-center -mb-1 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {status !== "collected" && (
                  <AddCollectionButton
                    projectId={projectId}
                    invoice={inv}
                    remainingAmount={remainingAmount}
                    onSuccess={refetch}
                  />
                )}
                <EditInvoiceButton
                  projectId={projectId}
                  invoice={inv}
                  onSuccess={refetch}
                />
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDeleteInvoice(inv)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </nav>
            </div>

            {/* 수금 건 인라인 표시 */}
            {invoiceCollections.length > 0 && (
              <ul className="mt-2 pl-4 space-y-1 border-l-2 border-muted">
                {invoiceCollections.map((col) => (
                  <li key={col.id} className="group/col flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>수금 {col.paidDate}</span>
                      {col.description && <span className="truncate max-w-[120px]">{col.description}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="tabular-nums text-info">{formatCurrency(Number(col.amount))}원</span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="opacity-0 group-hover/col:opacity-100 transition-opacity"
                        onClick={() => handleDeleteCollection(col)}
                      >
                        <Trash2Icon className="size-2.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── 수금 등록 팝오버 ────────────────────────────────────────────

function AddCollectionButton({
  projectId,
  invoice,
  remainingAmount,
  onSuccess,
}: {
  projectId: string;
  invoice: InvoiceDTO;
  remainingAmount: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <PlusIcon className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <AddCollectionForm
          projectId={projectId}
          invoice={invoice}
          remainingAmount={remainingAmount}
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

function AddCollectionForm({
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
  const [amount, setAmount] = useState<number | undefined>(remainingAmount > 0 ? remainingAmount : undefined);
  const [paidDate, setPaidDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCollection = useCreateCollection();

  const handleSubmit = async () => {
    if (!amount || !paidDate) return;
    setIsSubmitting(true);
    try {
      await createCollection.mutateAsync({
        projectId,
        invoiceId: invoice.id,
        description: description.trim(),
        amount,
        paidDate: format(paidDate, "yyyy-MM-dd"),
        paymentType: invoice.paymentType as "deposit" | "interim" | "balance" | "additional",
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">잔여 미수금: {formatCurrency(remainingAmount)}원</p>
      <AmountInput value={amount} onChange={setAmount} placeholder="수금 금액" />
      <DatePicker
        mode="single"
        value={paidDate}
        onValueChange={(d) => d && setPaidDate(d)}
        placeholder="수금일"
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="메모 (선택)"
      />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          취소
        </Button>
        <LoadingButton size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
          수금 등록
        </LoadingButton>
      </div>
    </div>
  );
}

// ── 수정 팝오버 ────────────────────────────────────────────────

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
  const [paymentType, setPaymentType] = useState(invoice.paymentType);
  const [description, setDescription] = useState(invoice.description);
  const [amount, setAmount] = useState<number | undefined>(Number(invoice.amount));
  const [issueDate, setIssueDate] = useState<Date>(parseISO(invoice.issueDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateInvoice = useUpdateInvoice();

  const handleSubmit = async () => {
    if (!amount || !issueDate) return;
    setIsSubmitting(true);
    try {
      await updateInvoice.mutateAsync({
        projectId,
        invoiceId: invoice.id,
        paymentType,
        description: description.trim(),
        amount,
        issueDate: format(issueDate, "yyyy-MM-dd"),
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <NativeSelect value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
        {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="내용 (선택)"
      />
      <div className="grid grid-cols-2 gap-2">
        <AmountInput value={amount} onChange={setAmount} placeholder="VAT 포함" />
        <DatePicker
          mode="single"
          value={issueDate}
          onValueChange={(d) => d && setIssueDate(d)}
          placeholder="발행일"
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
