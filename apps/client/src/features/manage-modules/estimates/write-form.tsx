import { useEffect } from "react";
import { useForm, useFormContext, useWatch, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { addMonths, format, parseISO } from "date-fns";
import { z } from "zod";
import { estimateWriteSchema } from "@packages/schemas";
import { calculateTotal, buildPriceSummaryDisplay } from "@packages/utils";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormTextarea,
  FormNativeSelect,
  FormDatePicker,
  FormNumberInput,
  FormSwitch,
} from "@/shared/ui/form";
import { SheetFooter, SheetBody } from "@/shared/ui/sheet";
import { PdfPreview } from "@/shared/ui/pdf-preview";
import { formatCurrency } from "@/shared/utils/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useBusinessInfo } from "@/features/settings/api";
import {
  useManageSheet,
  useManageSheetData,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
  ClientSelect,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateEstimate, useUpdateEstimate } from "./api";
import { DISCOUNT_OPTIONS, DEFAULT_UNIT } from "./constants";
import type { EstimateWithDetails } from "./types";
import { ItemGroupEditor } from "./item-group-editor";
import {
  type EstimateDocumentData,
  generateEstimateDocumentPdfBlob,
} from "./pdf/estimate-document";

// 로컬 폼 스키마: 서버 스키마 확장 (날짜를 Date 객체로 override, clientName 추가)
const formSchema = estimateWriteSchema.extend({
  clientName: z.string(),
  issuedDate: z.date().nullable().optional(),
  validUntil: z.date().nullable().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const formDefaultValues: FormValues = {
  clientId: "",
  clientName: "",
  title: "",
  description: "",
  versionLabel: "초안",
  issuedDate: new Date(),
  validUntil: addMonths(new Date(), 1),
  taxType: "vat",
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
    issuedDate: data.issuedDate ? parseISO(data.issuedDate) : null,
    validUntil: data.validUntil ? parseISO(data.validUntil) : null,
    taxType: (data.taxType as "withholding" | "vat") ?? "vat",
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
  const { refetch } = useManageSheetData();
  const isDuplicate = sheet.data?.mode === "duplicate";
  const versionOf = sheet.data?.meta?.versionOf as string | undefined;
  const isNewVersion = isDuplicate && !!versionOf;

  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: prevValues ? toFormValues(prevValues) : formDefaultValues,
  });
  useFormGuard(form);

  const discountType = useWatch({ control: form.control, name: "discountType" });

  useEffect(() => {
    if (prevValues) {
      const values = toFormValues(prevValues);
      if (isDuplicate) {
        const now = new Date();
        values.issuedDate = now;
        values.validUntil = addMonths(now, 1);
      }
      form.reset(values);
    } else {
      const now = new Date();
      form.reset({
        ...formDefaultValues,
        issuedDate: now,
        validUntil: addMonths(now, 1),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  const issuedDate = form.watch("issuedDate");

  useEffect(() => {
    if (!issuedDate) return;
    // 기존 저장된 발행일과 같으면 유효기간 자동변경 안 함
    const prevDate = prevValues?.issuedDate;
    if (prevDate && format(issuedDate, "yyyy-MM-dd") === prevDate) return;
    form.setValue("validUntil", addMonths(issuedDate, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuedDate]);

  async function onSubmit(values: FormValues) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientName, ...serverValues } = values;
      const submitData = {
        ...serverValues,
        issuedDate: values.issuedDate
          ? format(values.issuedDate, "yyyy-MM-dd")
          : undefined,
        validUntil: values.validUntil
          ? format(values.validUntil, "yyyy-MM-dd")
          : undefined,
        groups: serverValues.groups.map((g, gi) => ({
          ...g,
          sortOrder: gi,
          items: g.items.map((item, ii) => ({ ...item, sortOrder: ii })),
        })),
        ...(isNewVersion ? { estimateNumber: versionOf } : {}),
      };

      let createdId: string;
      if (id && !isDuplicate) {
        const result = await updateEstimate.mutateAsync({ id, data: submitData });
        createdId = (result as { id: string }).id ?? id;
      } else {
        const result = await createEstimate.mutateAsync(submitData);
        createdId = (result as { id: string }).id;
      }

      toast.success(id && !isDuplicate ? SUCCESS_MESSAGES.UPDATE_SUCCESS("견적서") : SUCCESS_MESSAGES.CREATE_SUCCESS("견적서"));
      sheet.open({ id: createdId, mode: "view" });
      if (id && !isDuplicate) refetch();
    } catch {
      toast.error(id && !isDuplicate ? CRUD_ERRORS.UPDATE_FAILED("견적서") : CRUD_ERRORS.CREATE_FAILED("견적서"));
    }
  }

  return (
    <SheetBody>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full space-y-0!">
          <div className="grid grid-cols-[1fr_800px] gap-0 flex-1 min-h-0 divide-x">
            {/* 폼 영역 */}
            <div className="overflow-y-auto 2xl:overflow-hidden hide-scrollbar 2xl:grid 2xl:grid-cols-[2fr_3fr] 2xl:divide-x min-h-0">
              {/* 1단: 기본 정보 */}
              <div className="px-6 py-5 2xl:overflow-y-auto hide-scrollbar">
                <FieldGroup>
                  <ClientSelect
                    disabled={!!id && !isDuplicate}
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
                  <FormDatePicker
                    control={form.control}
                    name="issuedDate"
                    label="발행일"
                    placeholder="발행일을 선택해주세요."
                  />
                  <FormDatePicker
                    control={form.control}
                    name="validUntil"
                    label="유효기간"
                    placeholder="유효기간을 선택해주세요."
                    optional
                  />
                  <FormTextarea
                    control={form.control}
                    name="notes"
                    label="비고"
                    placeholder="비고를 입력해주세요."
                    description="줄바꿈으로 항목이 구분됩니다."
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
              </div>

              {/* 2단: 견적 항목 + 금액 요약 */}
              <div className="2xl:relative 2xl:overflow-y-auto hide-scrollbar">
                <div className="2xl:min-h-full 2xl:flex 2xl:flex-col">
                  <div className="flex-1 px-6 py-5">
                    <ItemGroupEditor />
                  </div>
                  <div className="sticky bottom-0 border-t border-border-dark/50 bg-background/60 backdrop-blur-md">
                    <div className="px-6 pt-4 pb-2 space-y-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <FormNativeSelect
                            control={form.control}
                            name="discountType"
                            label="할인 타입"
                            options={[...DISCOUNT_OPTIONS]}
                          />
                        </div>
                        <div className="flex-1">
                          <FormNumberInput
                            control={form.control}
                            name="discountValue"
                            label={
                              discountType === "percentage"
                                ? "할인율 (%)"
                                : "할인 금액 (원)"
                            }
                            suffix={
                              discountType === "percentage"
                                ? "%"
                                : "원"
                            }
                            thousandSeparator={
                              discountType !== "percentage"
                            }
                            placeholder="0"
                            disabled={discountType === "none"}
                          />
                        </div>
                        <div className="pb-2 ml-auto">
                          <FormSwitch
                            control={form.control}
                            name="showTaxAmount"
                            label="부가세 금액 표기"
                          />
                        </div>
                      </div>
                    </div>
                    <EstimateTotalSummary />
                  </div>
                </div>
              </div>
            </div>

            {/* 3단: PDF 실시간 미리보기 */}
            <div className="flex flex-col min-h-0">
              <EstimateFormPdfPreview prevValues={prevValues} />
            </div>
          </div>

          <SheetFooter>
            <ManageSheetClose />
            {(id || isDuplicate) && <ManageSheetModeChange mode="view" />}
            <ManageFormSubmit isLoading={form.formState.isSubmitting} />
          </SheetFooter>
        </form>
      </FormProvider>
    </SheetBody>
  );
}

function EstimateTotalSummary() {
  const { control } = useFormContext<FormValues>();

  const groups = useWatch({ control, name: "groups" }) ?? [];
  const taxType = useWatch({ control, name: "taxType" }) ?? "vat";
  const discountType = useWatch({ control, name: "discountType" });
  const discountValue = useWatch({ control, name: "discountValue" }) ?? 0;
  const showTaxAmount = useWatch({ control, name: "showTaxAmount" }) ?? true;

  const totals = calculateTotal(groups, taxType, discountType, discountValue);
  const { hasDiscount, showTaxRows, hasDetails, totalLabel, totalValue } =
    buildPriceSummaryDisplay(totals, taxType, showTaxAmount);

  return (
    <div className="px-6 py-4 space-y-2">
      {hasDiscount && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">합계</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(totals.subtotal)}원
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">할인</span>
            <span className="tabular-nums text-red-600">
              -{formatCurrency(totals.discountAmount)}원
            </span>
          </div>
        </>
      )}
      {showTaxRows && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">공급가액</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(totals.supplyAmount)}원
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">부가세</span>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(totals.taxAmount)}원
            </span>
          </div>
        </>
      )}
      <div
        className={`${hasDetails ? "border-t border-border/50 pt-2.5" : ""} flex justify-between items-baseline`}
      >
        <span className="text-sm font-semibold">{totalLabel}</span>
        <span className="font-bold text-lg tabular-nums tracking-tight">
          {formatCurrency(totalValue)}
          <span className="text-sm font-semibold ml-0.5">원</span>
        </span>
      </div>
    </div>
  );
}

function EstimateFormPdfPreview({
  prevValues,
}: {
  prevValues: EstimateWithDetails | null;
}) {
  const { control } = useFormContext<FormValues>();
  const { user } = useAuth();
  const { data: bizInfo } = useBusinessInfo();
  const values = useWatch({ control }) as FormValues;

  const documentData: EstimateDocumentData = {
    title: values.title || "(제목 없음)",
    description: values.description || undefined,
    clientName: values.clientName || undefined,
    estimateNumber: prevValues?.estimateNumber,
    version: prevValues?.version,
    versionLabel: values.versionLabel || undefined,
    issuedDate: values.issuedDate
      ? format(values.issuedDate, "yyyy-MM-dd")
      : undefined,
    validUntil: values.validUntil
      ? format(values.validUntil, "yyyy-MM-dd")
      : undefined,
    issuer: user?.name || undefined,
    issuerPhone: user?.phone ?? undefined,
    issuerEmail: user?.email || undefined,
    bizName: bizInfo?.name ?? undefined,
    ceo: bizInfo?.ceo ?? undefined,
    bizNumber: bizInfo?.bizNumber ?? undefined,
    bizAddress: bizInfo?.address ?? undefined,
    taxType: values.taxType,
    showTaxAmount: values.showTaxAmount ?? true,
    discountType: values.discountType,
    discountValue: values.discountValue,
    notes: values.notes || undefined,
    groups: (values.groups ?? []).map((g) => ({
      name: g.name,
      items: g.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        amount: item.amount,
      })),
    })),
  };

  const dependencyKey = JSON.stringify(documentData);

  const generateBlob = () => generateEstimateDocumentPdfBlob(documentData);

  const fileName = prevValues
    ? `견적서_${prevValues.estimateNumber}.pdf`
    : "견적서.pdf";

  return (
    <PdfPreview
      generateBlob={generateBlob}
      downloadFileName={fileName}
      dependencyKey={dependencyKey}
    />
  );
}
