import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  adminCreateSchema,
  type AdminCreateInput,
} from "@packages/schemas";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormPasswordInput,
  FormPhoneInput,
} from "@/shared/ui/form";
import {
  SheetFooter,
  SheetBody,
  SheetContainer,
} from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { IS_DEMO } from "@/shared/lib/demo";
import { DEMO_MESSAGES } from "@packages/types";
import { DemoOverlay, DemoOverlayMessage } from "@/shared/ui/demo-overlay";
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
};

// UpdateForm 로컬 스키마 (username은 disabled 표시용)
const updateFormSchema = z
  .object({
    username: z.string().default(""),
    name: z.string().min(1, "이름을 입력해주세요."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    phone: z.string().optional(),
    password: z
      .string()
      .min(6, "비밀번호는 6자 이상이어야 합니다.")
      .optional()
      .or(z.literal("")),
    passwordConfirm: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.passwordConfirm;
      }
      return true;
    },
    { message: "비밀번호가 일치하지 않습니다.", path: ["passwordConfirm"] }
  );
type UpdateFormValues = z.infer<typeof updateFormSchema>;

const updateDefaults: UpdateFormValues = {
  username: "",
  name: "",
  email: "",
  phone: "",
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
                label="아이디"
                placeholder="로그인에 사용할 아이디"
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
              <FormPhoneInput
                control={form.control}
                name="phone"
                label="연락처"
                placeholder="010-1234-5678"
                optional
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

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema) as Resolver<UpdateFormValues>,
    defaultValues: prevValues
      ? {
          username: prevValues.username ?? "",
          name: prevValues.name,
          email: prevValues.email,
          phone: prevValues.phone ?? "",
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
            username: prevValues.username ?? "",
            name: prevValues.name,
            email: prevValues.email,
            phone: prevValues.phone ?? "",
            password: "",
            passwordConfirm: "",
          }
        : updateDefaults
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: UpdateFormValues) {
    const data: Record<string, unknown> = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
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
                name="username"
                label="아이디"
                description="아이디는 수정할 수 없습니다."
                disabled
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
              <FormPhoneInput
                control={form.control}
                name="phone"
                label="연락처"
                placeholder="010-1234-5678"
                optional
              />
              <div className="relative">
                <FieldGroup>
                  <FormPasswordInput
                    control={form.control}
                    name="password"
                    label="비밀번호"
                    placeholder="변경할 비밀번호 (미입력시 유지)"
                    optional
                    disabled={IS_DEMO}
                  />
                  <FormPasswordInput
                    control={form.control}
                    name="passwordConfirm"
                    label="비밀번호 확인"
                    placeholder="비밀번호를 다시 입력해주세요."
                    optional
                    disabled={IS_DEMO}
                  />
                </FieldGroup>

                {IS_DEMO && (
                  <DemoOverlay>
                    <DemoOverlayMessage>{DEMO_MESSAGES.PASSWORD_BLOCKED}</DemoOverlayMessage>
                  </DemoOverlay>
                )}
              </div>
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
