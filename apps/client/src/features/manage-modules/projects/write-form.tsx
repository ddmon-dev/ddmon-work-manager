import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectWriteSchema, type ProjectWriteInput } from "@work-manager/schemas";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput, FormTextarea, FormSelect } from "@/shared/ui/form";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateProject, useUpdateProject } from "./api";
import {
  PROJECT_STATUS_OPTIONS,
  WORK_PHASE_OPTIONS,
  TAX_TYPE_OPTIONS,
} from "./config";
import type { ProjectWithDetails } from "./types";
import { useClientList } from "../clients/api";

interface WriteFormProps {
  id?: string;
  prevValues: ProjectWithDetails | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const { data: clientsData } = useClientList({ pageSize: 100 });
  const clientOptions =
    clientsData?.items.map((c) => ({ value: c.id, label: c.companyName })) ?? [];

  const form = useForm<ProjectWriteInput>({
    resolver: zodResolver(projectWriteSchema) as Resolver<ProjectWriteInput>,
    defaultValues: prevValues
      ? {
          clientId: prevValues.clientId,
          estimateNumber: prevValues.estimateNumber ?? undefined,
          name: prevValues.name,
          description: prevValues.description ?? "",
          status: prevValues.status,
          workPhase: prevValues.workPhase,
          contractDate: prevValues.contractDate,
          completedDate: prevValues.completedDate ?? undefined,
          deliveredDate: prevValues.deliveredDate ?? undefined,
          notes: prevValues.notes ?? "",
          contractAmount: prevValues.contractAmount
            ? Number(prevValues.contractAmount)
            : undefined,
          taxType: prevValues.taxType ?? undefined,
        }
      : {
          clientId: "",
          name: "",
          description: "",
          status: "pending",
          workPhase: "preparing",
          contractDate: new Date().toISOString().split("T")[0],
          notes: "",
        },
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(
      prevValues
        ? {
            clientId: prevValues.clientId,
            estimateNumber: prevValues.estimateNumber ?? undefined,
            name: prevValues.name,
            description: prevValues.description ?? "",
            status: prevValues.status,
            workPhase: prevValues.workPhase,
            contractDate: prevValues.contractDate,
            completedDate: prevValues.completedDate ?? undefined,
            deliveredDate: prevValues.deliveredDate ?? undefined,
            notes: prevValues.notes ?? "",
            contractAmount: prevValues.contractAmount
              ? Number(prevValues.contractAmount)
              : undefined,
            taxType: prevValues.taxType ?? undefined,
          }
        : {
            clientId: "",
            name: "",
            description: "",
            status: "pending",
            workPhase: "preparing",
            contractDate: new Date().toISOString().split("T")[0],
            notes: "",
          }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: ProjectWriteInput) {
    if (id) {
      await updateProject.mutateAsync({ id, data: values });
    } else {
      await createProject.mutateAsync(values);
    }
    sheet.close();
  }

  const isModify = !!id;

  return (
    <SheetBody>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y">
          <SheetContainer>
            <FieldGroup>
              <FormSelect
                control={form.control}
                name="clientId"
                label="클라이언트"
                options={clientOptions}
                placeholder="클라이언트를 선택해주세요."
                disabled={isModify}
              />
              <FormTextInput
                control={form.control}
                name="name"
                label="프로젝트명"
                placeholder="프로젝트명을 입력해주세요."
              />
              <FormTextarea
                control={form.control}
                name="description"
                label="설명"
                placeholder="프로젝트 설명을 입력해주세요."
                optional
                rows={3}
              />
              <FormTextInput
                control={form.control}
                name="estimateNumber"
                label="견적서 번호"
                placeholder="견적서 번호 (선택)"
                optional
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormSelect
                control={form.control}
                name="status"
                label="상태"
                options={PROJECT_STATUS_OPTIONS}
              />
              <FormSelect
                control={form.control}
                name="workPhase"
                label="작업단계"
                options={WORK_PHASE_OPTIONS}
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="contractDate"
                label="계약일"
                type="date"
              />
              <FormTextInput
                control={form.control}
                name="deliveredDate"
                label="납품일"
                type="date"
                optional
              />
              <FormTextInput
                control={form.control}
                name="completedDate"
                label="완료일"
                type="date"
                optional
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="contractAmount"
                label="계약금액"
                type="number"
                placeholder="계약금액 (원)"
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
                rows={3}
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
    </SheetBody>
  );
}
