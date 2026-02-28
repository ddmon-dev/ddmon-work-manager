import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormPasswordInput,
  FormPhoneInput,
} from "@/shared/ui/form";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { authClient } from "@/features/auth/lib/auth-client";
import { api } from "@/shared/lib/api-client";
import { APP_CONFIG } from "@/app.config";

const formSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    phone: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
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
          form.setError("currentPassword", {
            message: result.error.message ?? "비밀번호 변경에 실패했습니다.",
          });
          return;
        }
        toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
        await authClient.signOut();
        window.location.href = APP_CONFIG.AUTH.PATHS.SIGN_IN;
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

      toast.success("프로필이 수정되었습니다.");
      setOpen(false);
    } catch {
      form.setError("root", { message: "수정에 실패했습니다." });
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
            <FormTextInput
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
                optional
              />
              <FormPasswordInput
                control={form.control}
                name="newPassword"
                label="새 비밀번호"
                placeholder="새 비밀번호 (최소 6자)"
                optional
              />
              <FormPasswordInput
                control={form.control}
                name="confirmPassword"
                label="비밀번호 확인"
                placeholder="비밀번호 확인"
                optional
              />
            </FieldGroup>
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              수정
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
