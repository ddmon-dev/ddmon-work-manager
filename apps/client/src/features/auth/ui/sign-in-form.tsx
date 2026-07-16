import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FieldGroup } from "@/shared/ui/field";
import {
  FormTextInput,
  FormPasswordInput,
  FormRootError,
} from "@/shared/ui/form";
import { LoadingButton } from "@/shared/ui/loading-button";
import { IS_DEMO } from "@/shared/lib/demo";
import { authClient } from "../lib/auth-client";

const signInSchema = z.object({
  id: z.string().min(1, { message: "아이디를 입력해주세요." }),
  password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
});

const defaultValues = {
  id: "",
  password: "",
};

export function SignInForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signInSchema>>({
    defaultValues,
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(values: z.infer<typeof signInSchema>) {
    setError(null);

    const { data, error: authError } = await authClient.signIn.username({
      username: values.id,
      password: values.password,
    });

    if (authError || !data) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-y-6">
        <FieldGroup className="gap-y-4">
          <FormTextInput
            name="id"
            label="아이디"
            control={form.control}
            placeholder="아이디를 입력하세요"
            autoFocus
            disabled={IS_DEMO}
          />
          <FormPasswordInput
            name="password"
            label="비밀번호"
            control={form.control}
            placeholder="비밀번호를 입력하세요"
            disabled={IS_DEMO}
          />
        </FieldGroup>

        {error && <FormRootError>{error}</FormRootError>}

        <LoadingButton
          type="submit"
          variant="black"
          isLoading={form.formState.isSubmitting}
          disabled={IS_DEMO}
        >
          로그인
        </LoadingButton>
      </FieldGroup>
    </form>
  );
}
