import { useEffect } from "react";
import { Link } from "react-router";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { projectWriteSchema, type ProjectWriteInput } from "@packages/schemas";
import { Field, FieldGroup, FieldTitle } from "@/shared/ui/field";
import { Button } from "@/shared/ui/button";
import {
  FormTextInput,
  FormTextarea,
  FormRadioGroup,
  FormDatePicker,
  FormNumberInput,
  FormNativeSelect,
} from "@/shared/ui/form";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  useManageSheet,
  useManageSheetData,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
  ClientSelect,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateProject, useUpdateProject, fetchEstimateProjectInfo, useAvailableEstimates } from "./api";
import { ProjectPartnerSection } from "./project-partner-section";
import { PROJECT_STATUS_OPTIONS, WORK_PHASE_OPTIONS } from "./config";
import { TAX_OPTIONS } from "../estimates/constants";
import type { ProjectWithDetails } from "./types";

// 로컬 폼 스키마: 날짜를 Date 객체로 override
const formSchema = projectWriteSchema.extend({
  contractDate: z.date({ required_error: "계약일을 입력해주세요." }),
  completedDate: z.date().nullable().optional(),
  deliveredDate: z.date().nullable().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const formDefaultValues: FormValues = {
  clientId: "",
  billingClientId: null,
  estimateNumber: undefined,
  name: "",
  description: "",
  status: "pending",
  workPhase: "preparing",
  contractDate: new Date(),
  completedDate: null,
  deliveredDate: null,
  notes: "",
  taxType: "vat",
};

function toFormValues(data: ProjectWithDetails): FormValues {
  return {
    clientId: data.clientId,
    billingClientId: data.billingClientId ?? null,
    estimateNumber: data.estimateNumber ?? undefined,
    name: data.name,
    description: data.description ?? "",
    status: data.status,
    workPhase: data.workPhase,
    contractDate: data.contractDate ? parseISO(data.contractDate) : new Date(),
    completedDate: data.completedDate ? parseISO(data.completedDate) : null,
    deliveredDate: data.deliveredDate ? parseISO(data.deliveredDate) : null,
    notes: data.notes ?? "",
    contractAmount: data.contractAmount ? Number(data.contractAmount) : undefined,
    taxType: (data.taxType as "withholding" | "vat" | undefined) ?? undefined,
  };
}

interface WriteFormProps {
  id?: string;
  prevValues: ProjectWithDetails | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const { refetch } = useManageSheetData<ProjectWithDetails>();
  const { get } = useQueryParams();
  const createFrom = get("create_from");

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: prevValues ? toFormValues(prevValues) : formDefaultValues,
  });
  useFormGuard(form);

  useEffect(() => {
    form.reset(prevValues ? toFormValues(prevValues) : formDefaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  // create_from 파라미터로 견적서 정보 자동 채움
  useEffect(() => {
    if (!createFrom || id || prevValues) return;
    form.setValue("estimateNumber", createFrom);
    fetchEstimateProjectInfo(createFrom).then((info) => {
      form.setValue("clientId", info.clientId);
      if (info.billingClientId) form.setValue("billingClientId", info.billingClientId);
      form.setValue("name", info.title);
      if (info.description) form.setValue("description", info.description);
      if (info.supplyAmount) form.setValue("contractAmount", info.supplyAmount);
    }).catch(() => {
      // 견적서 정보 조회 실패 시 견적서 번호만 세팅된 상태 유지
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFrom]);

  // 견적서 옵션 조회
  const watchedClientId = form.watch("clientId");
  const { data: availableEstimates, isLoading: isEstimatesLoading } = useAvailableEstimates(
    watchedClientId || undefined,
    prevValues?.estimateNumber
  );

  // 클라이언트 변경 시 견적서 초기화 (생성 모드, create_from이 아닌 경우만)
  // + billingClientId가 새 clientId와 동일하면 초기화
  useEffect(() => {
    if (id || createFrom) return;
    form.setValue("estimateNumber", undefined);
    if (watchedClientId && form.getValues("billingClientId") === watchedClientId) {
      form.setValue("billingClientId", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClientId]);

  // 견적서 선택 시 자동 채움 (생성 모드 전용)
  const watchedEstimateNumber = form.watch("estimateNumber");
  useEffect(() => {
    if (id || !watchedEstimateNumber || !availableEstimates) return;
    const matched = availableEstimates.find(e => e.estimateNumber === watchedEstimateNumber);
    if (!matched) return;
    form.setValue("name", matched.title);
    if (matched.description) form.setValue("description", matched.description);
    if (matched.supplyAmount) form.setValue("contractAmount", matched.supplyAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, watchedEstimateNumber, availableEstimates]);

  // workPhase → delivered 시 납품일 자동 입력
  const watchedWorkPhase = form.watch("workPhase");
  useEffect(() => {
    if (watchedWorkPhase === "delivered" && !form.getValues("deliveredDate")) {
      form.setValue("deliveredDate", new Date());
    }
  }, [watchedWorkPhase, form]);

  // status → completed 시 완료일 자동 입력
  const watchedStatus = form.watch("status");
  useEffect(() => {
    if (watchedStatus === "completed" && !form.getValues("completedDate")) {
      form.setValue("completedDate", new Date());
    }
  }, [watchedStatus, form]);

  async function onSubmit(values: FormValues) {
    const submitData: ProjectWriteInput = {
      ...values,
      billingClientId: values.billingClientId || null,
      contractDate: format(values.contractDate, "yyyy-MM-dd"),
      completedDate: values.completedDate
        ? format(values.completedDate, "yyyy-MM-dd")
        : undefined,
      deliveredDate: values.deliveredDate
        ? format(values.deliveredDate, "yyyy-MM-dd")
        : undefined,
    };

    if (id) {
      await updateProject.mutateAsync({ id, data: submitData });
    } else {
      await createProject.mutateAsync(submitData);
    }
    sheet.close();
  }

  return (
    <SheetBody>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="divide-y">
            <SheetContainer className="space-y-6">
              <FieldGroup>
                <ClientSelect
                  disabled={!!id}
                  description={id ? "프로젝트 생성 후 변경할 수 없습니다." : undefined}
                />
                <ClientSelect
                  name="billingClientId"
                  label="청구 클라이언트"
                  placeholder="소통 클라이언트와 동일"
                  optional
                  excludeId={watchedClientId}
                />
                {!id && watchedClientId && availableEstimates?.length === 0 ? (
                  <Field>
                    <FieldTitle>견적서</FieldTitle>
                    <p className="text-sm text-muted-foreground">연결 가능한 견적서가 없습니다.</p>
                    <Link to="/estimates">
                      <Button type="button" variant="outline" size="sm">견적서 관리로 이동</Button>
                    </Link>
                  </Field>
                ) : watchedClientId || id ? (
                  <FormNativeSelect
                    control={form.control}
                    name="estimateNumber"
                    label="견적서"
                    description={id ? "프로젝트 생성 후 변경할 수 없습니다." : undefined}
                    options={[
                      { value: "", label: isEstimatesLoading ? "불러오는 중..." : "견적서를 선택해주세요." },
                      ...(availableEstimates ?? []).map(e => ({
                        value: e.estimateNumber,
                        label: `${e.estimateNumber} - ${e.title}`,
                      })),
                    ]}
                    disabled={!!id || isEstimatesLoading}
                    optional
                  />
                ) : null}
                <FormTextInput
                  control={form.control}
                  name="name"
                  label="프로젝트명"
                  placeholder="프로젝트명을 입력해주세요."
                />
                <FormTextInput
                  control={form.control}
                  name="description"
                  label="프로젝트 설명"
                  placeholder="프로젝트 설명을 입력해주세요."
                  optional
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormNumberInput
                    control={form.control}
                    name="contractAmount"
                    label="공급가액"
                    placeholder="공급가액 (원)"
                    suffix="원"
                    thousandSeparator
                    optional
                  />
                  <FormNativeSelect
                    control={form.control}
                    name="taxType"
                    label="세금 타입"
                    options={[...TAX_OPTIONS]}
                  />
                </div>
                <FormRadioGroup
                  control={form.control}
                  name="workPhase"
                  label="작업단계"
                  options={WORK_PHASE_OPTIONS}
                />
                <FormRadioGroup
                  control={form.control}
                  name="status"
                  label="프로젝트 상태"
                  options={PROJECT_STATUS_OPTIONS}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormDatePicker
                    control={form.control}
                    name="contractDate"
                    label="계약일"
                    placeholder="계약일을 선택해주세요."
                  />
                  <FormDatePicker
                    control={form.control}
                    name="deliveredDate"
                    label="납품일"
                    placeholder="납품일을 선택해주세요."
                    optional
                  />
                  <FormDatePicker
                    control={form.control}
                    name="completedDate"
                    label="완료일"
                    placeholder="완료일을 선택해주세요."
                    optional
                  />
                </div>
              </FieldGroup>

              <FieldGroup>
                <FormTextarea
                  control={form.control}
                  name="notes"
                  label="비고"
                  placeholder="비고를 입력해주세요."
                  optional
                />
              </FieldGroup>
            </SheetContainer>

            {id && prevValues && (
              <SheetContainer>
                <ProjectPartnerSection
                  projectId={id}
                  partners={prevValues.projectPartners ?? []}
                  refetch={refetch}
                />
              </SheetContainer>
            )}
          </div>

          <SheetFooter>
            <ManageSheetClose />
            {id && <ManageSheetModeChange mode="view" />}
            <ManageFormSubmit isLoading={form.formState.isSubmitting} />
          </SheetFooter>
        </form>
      </FormProvider>
    </SheetBody>
  );
}
