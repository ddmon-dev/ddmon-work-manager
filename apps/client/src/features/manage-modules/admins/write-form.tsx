import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminCreateSchema,
  adminUpdateSchema,
  type AdminCreateInput,
  type AdminUpdateInput,
} from "@work-manager/schemas";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput, FormPasswordInput, FormCheckbox } from "@/shared/ui/form";
import {
  SheetFooter,
  SheetBody,
  SheetContainer,
} from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateAdmin, useUpdateAdmin } from "./api";
import type { AdminDTO } from "./types";
import type { Resolver } from "react-hook-form";

const createDefaults: AdminCreateInput = {
  name: "",
  email: "",
  username: "",
  password: "",
  passwordConfirm: "",
  phone: "",
  superAdmin: false,
};

const updateDefaults: AdminUpdateInput = {
  name: "",
  email: "",
  phone: "",
  superAdmin: false,
  password: "",
  passwordConfirm: "",
};

interface WriteFormProps {
  id?: string;
  prevValues: AdminDTO | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const isUpdate = !!id;

  return isUpdate ? (
    <UpdateForm id={id} prevValues={prevValues} />
  ) : (
    <CreateForm />
  );
}

function CreateForm() {
  const sheet = useManageSheet();
  const createAdmin = useCreateAdmin();

  const form = useForm<AdminCreateInput>({
    resolver: zodResolver(adminCreateSchema) as Resolver<AdminCreateInput>,
    defaultValues: createDefaults,
  });

  useFormGuard(form);

  async function onSubmit(values: AdminCreateInput) {
    await createAdmin.mutateAsync({
      name: values.name,
      email: values.email,
      username: values.username,
      password: values.password,
      phone: values.phone || undefined,
      superAdmin: values.superAdmin,
    });
    sheet.close();
  }

  return (
    <SheetBody>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y">
          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="username"
                label="사용자명"
                placeholder="로그인에 사용할 사용자명"
              />
              <FormTextInput
                control={form.control}
                name="name"
                label="이름"
                placeholder="이름을 입력해주세요."
              />
              <FormTextInput
                control={form.control}
                name="email"
                label="이메일"
                placeholder="이메일을 입력해주세요."
              />
              <FormPasswordInput
                control={form.control}
                name="password"
                label="비밀번호"
                placeholder="6자 이상 입력해주세요."
              />
              <FormPasswordInput
                control={form.control}
                name="passwordConfirm"
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력해주세요."
              />
              <FormTextInput
                control={form.control}
                name="phone"
                label="연락처"
                placeholder="010-1234-5678"
                optional
              />
              <FormCheckbox
                control={form.control}
                name="superAdmin"
                label="최고 관리자 권한"
              />
            </FieldGroup>
          </SheetContainer>
        </div>

        <SheetFooter>
          <ManageSheetClose />
          <ManageFormSubmit isLoading={form.formState.isSubmitting} />
        </SheetFooter>
      </form>
    </SheetBody>
  );
}

function UpdateForm({
  id,
  prevValues,
}: {
  id: string;
  prevValues: AdminDTO | null;
}) {
  const sheet = useManageSheet();
  const updateAdmin = useUpdateAdmin();

  const form = useForm<AdminUpdateInput>({
    resolver: zodResolver(adminUpdateSchema) as Resolver<AdminUpdateInput>,
    defaultValues: prevValues
      ? {
          name: prevValues.name,
          email: prevValues.email,
          phone: prevValues.phone ?? "",
          superAdmin: prevValues.superAdmin,
          password: "",
          passwordConfirm: "",
        }
      : updateDefaults,
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(
      prevValues
        ? {
            name: prevValues.name,
            email: prevValues.email,
            phone: prevValues.phone ?? "",
            superAdmin: prevValues.superAdmin,
            password: "",
            passwordConfirm: "",
          }
        : updateDefaults
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: AdminUpdateInput) {
    const data: Record<string, unknown> = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      superAdmin: values.superAdmin,
    };
    if (values.password && values.password.length > 0) {
      data.password = values.password;
    }
    await updateAdmin.mutateAsync({ id, data });
    sheet.close();
  }

  return (
    <SheetBody>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y">
          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="name"
                label="이름"
                placeholder="이름을 입력해주세요."
              />
              <FormTextInput
                control={form.control}
                name="email"
                label="이메일"
                placeholder="이메일을 입력해주세요."
              />
              <FormPasswordInput
                control={form.control}
                name="password"
                label="비밀번호"
                placeholder="변경할 비밀번호 (미입력시 유지)"
                optional
              />
              <FormPasswordInput
                control={form.control}
                name="passwordConfirm"
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력해주세요."
                optional
              />
              <FormTextInput
                control={form.control}
                name="phone"
                label="연락처"
                placeholder="010-1234-5678"
                optional
              />
              <FormCheckbox
                control={form.control}
                name="superAdmin"
                label="최고 관리자 권한"
              />
            </FieldGroup>
          </SheetContainer>
        </div>

        <SheetFooter>
          <ManageSheetClose />
          <ManageSheetModeChange mode="view" />
          <ManageFormSubmit isLoading={form.formState.isSubmitting} />
        </SheetFooter>
      </form>
    </SheetBody>
  );
}
