import { useEffect } from "react";
import { useForm, useFormContext, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";
import { z } from "zod";
import { estimateWriteSchema } from "@work-manager/schemas";
import { calculateTotal, buildPriceSummaryDisplay } from "@work-manager/utils";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormTextarea,
  FormNativeSelect,
  FormNumberInput,
  FormCheckbox,
} from "@/shared/ui/form";
import { SheetFooter, SheetBody, SheetScrollColumn, SheetContainer } from "@/shared/ui/sheet";
import { formatCurrency } from "@/shared/utils/format";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
  ClientSelect,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateEstimate, useUpdateEstimate } from "./api";
import { TAX_OPTIONS, DISCOUNT_OPTIONS, DEFAULT_UNIT } from "./constants";
import type { EstimateWithDetails } from "./types";
import { ItemGroupEditor } from "./item-group-editor";

// 로컬 폼 스키마 (서버 스키마 + clientName 추가)
const formSchema = estimateWriteSchema.extend({
  clientName: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const formDefaultValues: FormValues = {
  clientId: "",
  clientName: "",
  title: "",
  description: "",
  versionLabel: "",
  issuedDate: format(new Date(), "yyyy-MM-dd"),
  issuer: "",
  validUntil: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
  taxType: "exclusive",
  discountType: "none",
  discountValue: 0,
  showTaxAmount: true,
  notes: "",
  memo: "",
  groups: [
    {
      name: "",
      sortOrder: 0,
      items: [{ name: "", quantity: 1, unit: DEFAULT_UNIT, amount: 0, sortOrder: 0 }],
    },
  ],
};

function toFormValues(data: EstimateWithDetails): FormValues {
  return {
    clientId: data.clientId,
    clientName: data.client?.companyName ?? "",
    title: data.title,
    description: data.description ?? "",
    versionLabel: data.versionLabel ?? "",
    issuedDate: data.issuedDate ?? format(new Date(), "yyyy-MM-dd"),
    issuer: data.issuer ?? "",
    validUntil: data.validUntil ?? null,
    taxType: (data.taxType as "inclusive" | "exclusive") ?? "exclusive",
    discountType: (data.discountType as "none" | "amount" | "percentage") ?? "none",
    discountValue: Number(data.discountValue) || 0,
    showTaxAmount: data.showTaxAmount ?? true,
    notes: data.notes ?? "",
    memo: data.memo ?? "",
    groups: data.groups.map((g, gi) => ({
      name: g.name,
      sortOrder: gi,
      items: g.items.map((item, ii) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? "",
        amount: Number(item.amount),
        sortOrder: ii,
      })),
    })),
  };
}

interface WriteFormProps {
  id?: string;
  prevValues: EstimateWithDetails | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const isClone = sheet.data?.mode === "clone";

  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: prevValues ? toFormValues(prevValues) : formDefaultValues,
  });
  useFormGuard(form);

  useEffect(() => {
    if (prevValues) {
      const values = toFormValues(prevValues);
      if (isClone) {
        const now = new Date();
        values.issuedDate = format(now, "yyyy-MM-dd");
        values.validUntil = format(addMonths(now, 1), "yyyy-MM-dd");
      }
      form.reset(values);
    } else {
      const now = new Date();
      form.reset({
        ...formDefaultValues,
        issuedDate: format(now, "yyyy-MM-dd"),
        validUntil: format(addMonths(now, 1), "yyyy-MM-dd"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: FormValues) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientName, ...serverValues } = values;
      const submitData = {
        ...serverValues,
        groups: serverValues.groups.map((g, gi) => ({
          ...g,
          sortOrder: gi,
          items: g.items.map((item, ii) => ({ ...item, sortOrder: ii })),
        })),
        ...(isClone && prevValues ? { estimateNumber: prevValues.estimateNumber } : {}),
      };

      let createdId: string;
      if (id && !isClone) {
        const result = await updateEstimate.mutateAsync({ id, data: submitData });
        createdId = (result as { id: string }).id ?? id;
      } else {
        const result = await createEstimate.mutateAsync(submitData);
        createdId = (result as { id: string }).id;
      }

      toast.success(id && !isClone ? "수정되었습니다." : "저장되었습니다.");
      sheet.open({ id: createdId, mode: "view" });
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  return (
    <SheetBody>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-0!">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:divide-x flex-1 min-h-0">
            {/* 1단: 기본 정보 */}
            <SheetScrollColumn>
              <SheetContainer>
                <FieldGroup>
                  <ClientSelect
                    disabled={!!id && !isClone}
                    onValueChange={(_, label) => form.setValue("clientName", label)}
                  />
                  <FormTextInput
                    control={form.control}
                    name="title"
                    label="견적서 제목"
                    placeholder="견적서 제목을 입력해주세요."
                  />
                  <FormTextInput
                    control={form.control}
                    name="description"
                    label="설명"
                    placeholder="예: 1차 - 프론트엔드 개발"
                    optional
                  />
                  <FormTextInput
                    control={form.control}
                    name="versionLabel"
                    label="버전명"
                    placeholder="예: 다이어그램 이미지삽입 및 어드민"
                    optional
                  />
                  <FormTextInput
                    control={form.control}
                    name="issuer"
                    label="발행자"
                    placeholder="발행자를 입력해주세요."
                    optional
                  />
                  <FormTextInput
                    control={form.control}
                    name="issuedDate"
                    label="발행일"
                    type="date"
                  />
                  <FormTextInput
                    control={form.control}
                    name="validUntil"
                    label="유효기간"
                    type="date"
                    optional
                  />
                  <FormTextarea
                    control={form.control}
                    name="notes"
                    label="비고"
                    placeholder="비고를 입력해주세요."
                    optional
                    rows={3}
                  />
                  <FormTextarea
                    control={form.control}
                    name="memo"
                    label="내부 메모"
                    placeholder="내부 관리용 메모를 입력해주세요."
                    optional
                    rows={3}
                  />
                </FieldGroup>
              </SheetContainer>
            </SheetScrollColumn>

            {/* 2단: 견적 항목 + 금액 요약 */}
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-8 py-5">
                <ItemGroupEditor />
              </div>

              {/* 금액 설정 + 요약 (하단 고정) */}
              <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm">
                <div className="px-4 md:px-8 pt-4 pb-2 space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormNativeSelect
                        control={form.control}
                        name="taxType"
                        label="세금 타입"
                        options={[...TAX_OPTIONS]}
                      />
                    </div>
                    <div className="flex-1">
                      <FormNativeSelect
                        control={form.control}
                        name="discountType"
                        label="할인 타입"
                        options={[...DISCOUNT_OPTIONS]}
                      />
                    </div>
                    {form.watch("discountType") !== "none" && (
                      <div className="flex-1">
                        <FormNumberInput
                          control={form.control}
                          name="discountValue"
                          label={form.watch("discountType") === "percentage" ? "할인율 (%)" : "할인 금액 (원)"}
                          suffix={form.watch("discountType") === "percentage" ? "%" : "원"}
                          thousandSeparator={form.watch("discountType") !== "percentage"}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                  <FormCheckbox
                    control={form.control}
                    name="showTaxAmount"
                    label="부가세 금액 표기"
                  />
                </div>
                <EstimateTotalSummary />
              </div>
            </div>
          </div>

          <SheetFooter>
            <ManageSheetClose />
            {(id || isClone) && <ManageSheetModeChange mode="view" />}
            <ManageFormSubmit isLoading={form.formState.isSubmitting} />
          </SheetFooter>
        </form>
      </FormProvider>
    </SheetBody>
  );
}

function EstimateTotalSummary() {
  const { watch } = useFormContext();

  const groups = watch("groups") ?? [];
  const taxType = watch("taxType") ?? "exclusive";
  const discountType = watch("discountType");
  const discountValue = watch("discountValue") ?? 0;
  const showTaxAmount = watch("showTaxAmount") ?? true;

  const totals = calculateTotal(groups, taxType, discountType, discountValue);
  const { hasDiscount, showTaxRows, hasDetails, totalLabel, totalValue } =
    buildPriceSummaryDisplay(totals, taxType, showTaxAmount);

  return (
    <div className="px-4 md:px-8 py-4 space-y-2">
      {hasDiscount && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">합계</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(totals.subtotal)}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">할인</span>
            <span className="tabular-nums text-red-600">-{formatCurrency(totals.discountAmount)}원</span>
          </div>
        </>
      )}
      {showTaxRows && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">공급가액</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(totals.supplyAmount)}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">부가세</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(totals.taxAmount)}원</span>
          </div>
        </>
      )}
      <div className={`${hasDetails ? "border-t border-border/50 pt-2.5" : ""} flex justify-between items-baseline`}>
        <span className="text-sm font-semibold">{totalLabel}</span>
        <span className="font-bold text-lg tabular-nums tracking-tight">
          {formatCurrency(totalValue)}
          <span className="text-sm font-semibold ml-0.5">원</span>
        </span>
      </div>
    </div>
  );
}
