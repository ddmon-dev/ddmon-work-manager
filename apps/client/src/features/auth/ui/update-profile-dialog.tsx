import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GENERAL_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormEmailInput,
  FormPasswordInput,
  FormPhoneInput,
  FormRootError,
} from "@/shared/ui/form";
import { PASSWORD_MIN_LENGTH } from "@packages/utils";
import { DEMO_MESSAGES } from "@packages/types";
import { IS_DEMO } from "@/shared/lib/demo";
import { DemoOverlay, DemoOverlayMessage } from "@/shared/ui/demo-overlay";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { authClient } from "@/features/auth/lib/auth-client";
import { useDialog } from "@/shared/ui/app-dialog";
import { api } from "@/shared/lib/api-client";
import { APP_CONFIG } from "@/app.config";

const formSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    phone: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH, `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`).optional().or(z.literal("")),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: "현재 비밀번호를 입력하세요.", path: ["currentPassword"] }
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword)
        return false;
      return true;
    },
    { message: "비밀번호가 일치하지 않습니다.", path: ["confirmPassword"] }
  );

type FormValues = z.infer<typeof formSchema>;

interface UpdateProfileDialogProps {
  children: React.ReactNode;
}

export function UpdateProfileDialog({ children }: UpdateProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const dialog = useDialog();
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // 비밀번호 변경
      if (values.newPassword && values.currentPassword) {
        const result = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          revokeOtherSessions: false,
        });
        if (result.error) {
          const message =
            result.error.message === "Invalid password"
              ? "현재 비밀번호가 올바르지 않습니다."
              : "비밀번호 변경에 실패했습니다.";
          form.setError("root", { message });
          return;
        }
        setOpen(false);
        dialog.alert({
          title: (
            <>
              비밀번호가 변경되었습니다.
              <br />
              다시 로그인해주세요.
            </>
          ),
          variant: "success",
          layout: "vertical",
          size: "sm",
          onConfirm: async () => {
            await authClient.signOut();
            window.location.href = APP_CONFIG.AUTH.PATHS.SIGN_IN;
          },
        });
        return;
      }

      // 프로필 정보 업데이트
      if (user?.id) {
        await api.patch(`/admins/${user.id}`, {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
        });
      }

      // 세션 데이터 갱신 (UI 반영)
      auth.refetch();

      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("프로필"));
      setOpen(false);
      form.reset({
        name: values.name,
        email: values.email,
        phone: values.phone ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      form.setError("root", { message: GENERAL_ERRORS.UNEXPECTED });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>내 정보 수정</DialogTitle>
          <DialogDescription>
            본인의 정보를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup>
            <FormTextInput
              control={form.control}
              name="name"
              label="이름"
              placeholder="이름을 입력하세요"
            />
            <FormEmailInput
              control={form.control}
              name="email"
              label="이메일"
              placeholder="이메일을 입력하세요"
            />
            <FormPhoneInput
              control={form.control}
              name="phone"
              label="전화번호"
              placeholder="전화번호를 입력하세요"
              optional
            />
          </FieldGroup>

          <div className="relative">
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                비밀번호를 변경하려면 아래 필드를 입력하세요.
              </p>
              <FieldGroup>
                <FormPasswordInput
                  control={form.control}
                  name="currentPassword"
                  label="현재 비밀번호"
                  placeholder="현재 비밀번호"
                  autoComplete="current-password"
                  optional
                  disabled={IS_DEMO}
                />
                <FormPasswordInput
                  control={form.control}
                  name="newPassword"
                  label="새 비밀번호"
                  placeholder={`새 비밀번호 (최소 ${PASSWORD_MIN_LENGTH}자)`}
                  autoComplete="new-password"
                  optional
                  disabled={IS_DEMO}
                />
                <FormPasswordInput
                  control={form.control}
                  name="confirmPassword"
                  label="비밀번호 확인"
                  placeholder="비밀번호 확인"
                  autoComplete="new-password"
                  optional
                  disabled={IS_DEMO}
                />
              </FieldGroup>
            </div>

            {IS_DEMO && (
              <DemoOverlay>
                <DemoOverlayMessage>{DEMO_MESSAGES.PASSWORD_BLOCKED}</DemoOverlayMessage>
              </DemoOverlay>
            )}
          </div>

          {form.formState.errors.root && (
            <FormRootError>{form.formState.errors.root.message}</FormRootError>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <LoadingButton
              type="submit"
              isLoading={form.formState.isSubmitting}
            >
              수정
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
