import { AuthContainer, AuthCard } from "@/features/auth/ui/auth-layout";
import { SignInForm } from "@/features/auth/ui/sign-in-form";
import { DemoLoginOverlay } from "@/features/auth/ui/demo-login-overlay";
import { IS_DEMO } from "@/shared/lib/demo";

export function SignInPage() {
  return (
    <AuthContainer>
      <AuthCard
        title="Welcome back!"
        description="관리자님, 다시 만나서 반가워요!"
      >
        <div className="relative">
          <SignInForm />
          {IS_DEMO && <DemoLoginOverlay />}
        </div>
      </AuthCard>
    </AuthContainer>
  );
}
