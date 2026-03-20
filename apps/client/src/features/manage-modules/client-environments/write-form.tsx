import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronsUpDown } from "lucide-react";
import { clientEnvironmentWriteSchema, type ClientEnvironmentWriteInput } from "@packages/schemas";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput, FormNumberInput, FormTextarea, FormFieldArray } from "@/shared/ui/form";
import {
  SheetFooter,
  SheetBody,
  SheetContainer,
} from "@/shared/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Button } from "@/shared/ui/button";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
  ClientSelect,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateClientEnvironment, useUpdateClientEnvironment } from "./api";
import type { ClientEnvironmentWithMemos } from "./types";

const formDefaultValues: ClientEnvironmentWriteInput = {
  clientId: "",
  name: "",
  hosting: { provider: "", username: "", password: "" },
  domain: { registrar: "", username: "", password: "" },
  ftp: { host: "", port: 21, username: "", password: "" },
  customFields: [],
  notes: "",
};

interface WriteFormProps {
  id?: string;
  prevValues: ClientEnvironmentWithMemos | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createEnv = useCreateClientEnvironment();
  const updateEnv = useUpdateClientEnvironment();

  const toFormValues = (data: ClientEnvironmentWithMemos | null): ClientEnvironmentWriteInput =>
    data
      ? {
          clientId: data.clientId,
          name: data.name,
          hosting: {
            provider: data.hosting?.provider ?? "",
            username: data.hosting?.username ?? "",
            password: data.hosting?.password ?? "",
          },
          domain: {
            registrar: data.domain?.registrar ?? "",
            username: data.domain?.username ?? "",
            password: data.domain?.password ?? "",
          },
          ftp: {
            host: data.ftp?.host ?? "",
            port: data.ftp?.port ?? 21,
            username: data.ftp?.username ?? "",
            password: data.ftp?.password ?? "",
          },
          customFields: data.customFields ?? [],
          notes: data.notes ?? "",
        }
      : formDefaultValues;

  const form = useForm<ClientEnvironmentWriteInput>({
    resolver: zodResolver(clientEnvironmentWriteSchema),
    defaultValues: toFormValues(prevValues),
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(toFormValues(prevValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: ClientEnvironmentWriteInput) {
    if (id) {
      await updateEnv.mutateAsync({ id, data: values });
    } else {
      await createEnv.mutateAsync(values);
    }
    sheet.close();
  }

  return (
    <FormProvider {...form}>
      <SheetBody>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="divide-y">
            {/* 기본 정보 */}
            <SheetContainer>
              <FieldGroup>
                <ClientSelect />
                <FormTextInput
                  control={form.control}
                  name="name"
                  label="사이트/서비스명"
                  placeholder="예: 홈페이지, 쇼핑몰, 관리자 시스템"
                />
              </FieldGroup>
            </SheetContainer>

            {/* 호스팅 */}
            <SheetContainer>
              <CollapsibleSection title="호스팅">
                <FieldGroup>
                  <FormTextInput control={form.control} name="hosting.provider" label="호스팅 업체" placeholder="예: 카페24, AWS" optional />
                  <FormTextInput control={form.control} name="hosting.username" label="아이디" optional />
                  <FormTextInput control={form.control} name="hosting.password" label="비밀번호" optional />
                </FieldGroup>
              </CollapsibleSection>
            </SheetContainer>

            {/* 도메인 */}
            <SheetContainer>
              <CollapsibleSection title="도메인">
                <FieldGroup>
                  <FormTextInput control={form.control} name="domain.registrar" label="등록 업체" placeholder="예: 가비아, 후이즈" optional />
                  <FormTextInput control={form.control} name="domain.username" label="아이디" optional />
                  <FormTextInput control={form.control} name="domain.password" label="비밀번호" optional />
                </FieldGroup>
              </CollapsibleSection>
            </SheetContainer>

            {/* FTP */}
            <SheetContainer>
              <CollapsibleSection title="FTP">
                <FieldGroup>
                  <FormTextInput control={form.control} name="ftp.host" label="호스트" optional />
                  <FormNumberInput control={form.control} name="ftp.port" label="포트" placeholder="21" optional />
                  <FormTextInput control={form.control} name="ftp.username" label="아이디" optional />
                  <FormTextInput control={form.control} name="ftp.password" label="비밀번호" optional />
                </FieldGroup>
              </CollapsibleSection>
            </SheetContainer>

            {/* 커스텀 필드 */}
            <SheetContainer>
              <FormFieldArray
                control={form.control}
                name="customFields"
                label="커스텀 필드"
                min={0}
                addButtonText="필드 추가"
                defaultValue={{ category: "", label: "", value: "" }}
              >
                {({ index, control }) => (
                  <div className="grid grid-cols-3 gap-2">
                    <FormTextInput control={control} name={`customFields.${index}.category`} label="" placeholder="카테고리" />
                    <FormTextInput control={control} name={`customFields.${index}.label`} label="" placeholder="항목명" />
                    <FormTextInput control={control} name={`customFields.${index}.value`} label="" placeholder="값" />
                  </div>
                )}
              </FormFieldArray>
            </SheetContainer>

            {/* 비고 */}
            <SheetContainer>
              <FieldGroup>
                <FormTextarea
                  control={form.control}
                  name="notes"
                  label="비고"
                  placeholder="추가 메모를 입력해주세요."
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
      </SheetBody>
    </FormProvider>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" type="button" className="w-full justify-between px-0 font-medium">
          {title}
          <ChevronsUpDown className="size-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
