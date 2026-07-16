import { useState } from "react";
import { LoadingButton } from "@/shared/ui/loading-button";

export function DemoLoginOverlay() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin() {
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/demo/login", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    if (!res?.ok) {
      setError("데모 접속에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
      return;
    }

    // raw fetch 로그인은 authClient 세션 캐시를 갱신하지 못하므로 전체 리로드로 재부트스트랩
    window.location.replace("/");
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-y-4 bg-background/60 backdrop-blur-[3px]">
      <p className="text-sm text-muted-foreground">
        데모 환경입니다. 버튼 한 번으로 둘러보세요.
      </p>
      <LoadingButton
        type="button"
        variant="black"
        onClick={handleDemoLogin}
        isLoading={isLoading}
      >
        데모로 접속
      </LoadingButton>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
