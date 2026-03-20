import { useState } from "react";
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
import { Badge } from "@/shared/ui/badge";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { DetailSectionTitle } from "../_base/ui";
import { useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "./api";
import type { InvoiceDTO } from "./types";

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

// ── 메인 컴포넌트 ──────────────────────────────────────────────

interface ProjectInvoiceSectionProps {
  projectId: string;
  invoices: InvoiceDTO[];
  refetch: () => void;
}

export function ProjectInvoiceSection({ projectId, invoices, refetch }: ProjectInvoiceSectionProps) {
  const uncollected = invoices.filter((i) => !i.paidDate);
  const uncollectedTotal = uncollected.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div>
      <DetailSectionTitle>세금계산서</DetailSectionTitle>
      <InvoiceForm projectId={projectId} onSuccess={refetch} />
      {invoices.length === 0 ? (
        <InlineEmpty message="발행된 세금계산서가 없습니다." />
      ) : (
        <>
          <InvoiceList projectId={projectId} invoices={invoices} refetch={refetch} />
          {uncollected.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              미수금 {uncollected.length}건 / {formatCurrency(uncollectedTotal)}원
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
  refetch,
}: {
  projectId: string;
  invoices: InvoiceDTO[];
  refetch: () => void;
}) {
  const dialog = useDialog();
  const deleteInvoice = useDeleteInvoice();
  const updateInvoice = useUpdateInvoice();

  const handleDelete = (invoice: InvoiceDTO) => {
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

  const handleMarkPaid = (invoice: InvoiceDTO, paidDate: Date) => {
    updateInvoice.mutate({
      projectId,
      invoiceId: invoice.id,
      paidDate: format(paidDate, "yyyy-MM-dd"),
    });
  };

  const handleUnmarkPaid = (invoice: InvoiceDTO) => {
    updateInvoice.mutate({
      projectId,
      invoiceId: invoice.id,
      paidDate: null,
    });
  };

  return (
    <ul className="space-y-0 divide-y border rounded-lg">
      {invoices.map((inv) => (
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
              {inv.paidDate ? (
                <button
                  type="button"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleUnmarkPaid(inv)}
                >
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    수금 {inv.paidDate}
                  </Badge>
                </button>
              ) : (
                <PaidDatePicker
                  onSelect={(date) => handleMarkPaid(inv, date)}
                />
              )}
            </div>
            <nav className="flex items-center -mb-1 -mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditInvoiceButton
                projectId={projectId}
                invoice={inv}
                onSuccess={refetch}
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={() => handleDelete(inv)}
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

// ── 수금일 선택 ────────────────────────────────────────────────

function PaidDatePicker({ onSelect }: { onSelect: (date: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer">
          <Badge variant="warning-light" className="text-[10px] px-1.5 py-0">
            미수금
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <DatePicker
          mode="single"
          value={new Date()}
          onValueChange={(d) => d && onSelect(d)}
          placeholder="수금일"
        />
      </PopoverContent>
    </Popover>
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
