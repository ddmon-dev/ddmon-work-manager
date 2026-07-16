import { useState } from "react";
import { toast } from "sonner";
import { AUTH_ERRORS } from "@/shared/constants/error-messages";
import { DemoOverlay, DemoOverlayMessage } from "@/shared/ui/demo-overlay";
import { LoadingButton } from "@/shared/ui/loading-button";

/**
 * 데모 모드 로그인 오버레이.
 *
 * 공용 DemoOverlay(backdrop-blur shell) 위에 원클릭 '데모로 접속' 버튼을 얹어
 * 데모 계정 실제 로그인을 수행한다. 폼을 지우지 않고 블러로 남겨 실제 인증 폼 존재를 보인다.
 */
export function DemoLoginOverlay() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDemoLogin() {
    setIsLoading(true);

    // 자격증명은 서버(/api/demo/login)가 주입한다. 클라이언트는 데모 접속 의사만 전달.
    const res = await fetch("/api/demo/login", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    if (!res?.ok) {
      toast.error(AUTH_ERRORS.UNKNOWN_ERROR);
      setIsLoading(false);
      return;
    }

    // raw fetch 로그인은 authClient 세션 캐시를 갱신하지 못하므로 전체 리로드로 재부트스트랩
    window.location.replace("/");
  }

  return (
    <DemoOverlay className="-inset-8">
      <DemoOverlayMessage>데모 계정으로 자유롭게 둘러보세요</DemoOverlayMessage>
      <LoadingButton
        type="button"
        variant="black"
        isLoading={isLoading}
        onClick={handleDemoLogin}
        className="min-w-40"
      >
        데모로 접속
      </LoadingButton>
    </DemoOverlay>
  );
}
