import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency } from "@/shared/utils/format";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { LoadingButton } from "@/shared/ui/loading-button";
import {
  FormTextInput,
  FormNumberInput,
  FormDatePicker,
} from "@/shared/ui/form";
import { useDialog } from "@/shared/ui/app-dialog";
import { InlineEmpty } from "@/shared/ui/inline-empty";
import { DetailSectionTitle } from "../_base/ui";
import {
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from "./api";
import type { PaymentDTO } from "./types";

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

export function PaymentForm({ projectId, payment, onSuccess, onCancel }: PaymentFormProps) {
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
        <div className={`grid gap-2 ${payment ? "grid-cols-[2fr_1.5fr]" : "grid-cols-[2fr_1.5fr_auto]"}`}>
          <div className={payment ? "col-span-2" : "col-span-3"}>
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
          {!payment && (
            <LoadingButton type="submit" rounded="full" isLoading={form.formState.isSubmitting}>
              추가
            </LoadingButton>
          )}
        </div>
        {payment && (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              취소
            </Button>
            <LoadingButton type="submit" size="sm" isLoading={form.formState.isSubmitting}>
              저장
            </LoadingButton>
          </div>
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

export function PaymentHistory({ projectId, payments, refetch }: PaymentHistoryProps) {
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
      <InlineEmpty message="아직 입금 내역이 없습니다." />
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
