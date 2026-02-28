import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { projectWriteSchema, type ProjectWriteInput } from "@work-manager/schemas";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormTextarea,
  FormRadioGroup,
  FormSelect,
  FormDatePicker,
  FormNumberInput,
} from "@/shared/ui/form";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
  ClientSelect,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateProject, useUpdateProject } from "./api";
import { PROJECT_STATUS_OPTIONS, WORK_PHASE_OPTIONS, TAX_TYPE_OPTIONS } from "./config";
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
  estimateNumber: undefined,
  name: "",
  description: "",
  status: "pending",
  workPhase: "preparing",
  contractDate: new Date(),
  completedDate: null,
  deliveredDate: null,
  notes: "",
};

function toFormValues(data: ProjectWithDetails): FormValues {
  return {
    clientId: data.clientId,
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
    taxType: data.taxType ?? undefined,
  };
}

interface WriteFormProps {
  id?: string;
  prevValues: ProjectWithDetails | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const [searchParams] = useSearchParams();
  const createFrom = searchParams.get("create_from");

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

  // create_from 파라미터로 견적서 번호 자동 입력
  useEffect(() => {
    if (!createFrom || id || prevValues) return;
    form.setValue("estimateNumber", createFrom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFrom]);

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
                <FormTextInput
                  control={form.control}
                  name="estimateNumber"
                  label="견적서 번호"
                  placeholder="견적서 번호 (선택)"
                  optional
                  disabled={!!id}
                  description={id ? "프로젝트 생성 후 변경할 수 없습니다." : undefined}
                />
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
                <FormNumberInput
                  control={form.control}
                  name="contractAmount"
                  label="계약금액"
                  placeholder="계약금액 (원)"
                  suffix="원"
                  thousandSeparator
                  optional
                />
                <FormSelect
                  control={form.control}
                  name="taxType"
                  label="세금 유형"
                  options={TAX_TYPE_OPTIONS}
                  optional
                />
                <FormTextarea
                  control={form.control}
                  name="notes"
                  label="비고"
                  placeholder="비고를 입력해주세요."
                  optional
                />
              </FieldGroup>
            </SheetContainer>
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
