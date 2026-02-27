import { AuthContainer, AuthCard } from "@/features/auth/ui/auth-layout";
import { SignInForm } from "@/features/auth/ui/sign-in-form";

export function SignInPage() {
  return (
    <AuthContainer>
      <AuthCard
        title="Welcome back!"
        description="관리자님, 다시 만나서 반가워요!"
      >
        <SignInForm />
      </AuthCard>
    </AuthContainer>
  );
}
