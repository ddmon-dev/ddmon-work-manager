import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { APP_CONFIG } from "@/app.config";
import { IS_DEMO } from "@/shared/lib/demo";
import { useDialog } from "@/shared/ui/app-dialog";
import { authClient } from "../lib/auth-client";

interface IdleLogoutProviderProps {
  children: React.ReactNode;
  /** 자동 로그아웃 시간 (분) */
  timeoutMinutes?: number;
  /** 로그아웃 경고 표시 시간 (분) */
  warningMinutes?: number;
}

const MINUTE_MS = 60 * 1000;

/**
 * 아이들(무활동) 자동 로그아웃. 데모 모드에서만 동작한다.
 *
 * 활동 이벤트마다 타이머를 리셋하고, 만료 5분 전 경고 toast →
 * 만료 시 세션 종료 후 안내 다이얼로그를 띄운다.
 * Better Auth 세션은 요청 시 자동 연장되므로 별도 세션 갱신 핑은 두지 않는다.
 */
export function IdleLogoutProvider({
  children,
  timeoutMinutes = APP_CONFIG.AUTH.IDLE_TIMEOUT_MINUTES,
  warningMinutes = APP_CONFIG.AUTH.IDLE_WARNING_MINUTES,
}: IdleLogoutProviderProps) {
  const dialog = useDialog();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 분 → ms 변환
  const timeout = timeoutMinutes * MINUTE_MS;
  const warningTime = warningMinutes * MINUTE_MS;

  useEffect(() => {
    if (!IS_DEMO) return;

    const resetTimers = () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }

      // 경고 타이머 (timeout - warningTime 후)
      warningTimerRef.current = setTimeout(() => {
        toast.warning("일정 시간 활동이 없어 잠시 후 자동 로그아웃됩니다.");
      }, timeout - warningTime);

      // 로그아웃 타이머 (timeout 후)
      logoutTimerRef.current = setTimeout(() => {
        void authClient.signOut();
        dialog.alert({
          title: "Session Expired",
          description: "일정 시간 활동이 없어 로그아웃 되었습니다.",
          variant: "default",
          size: "sm",
          layout: "vertical",
          onConfirm: () => {
            window.location.href = APP_CONFIG.AUTH.PATHS.SIGN_IN;
          },
        });
      }, timeout);
    };

    // 감지할 이벤트들
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"] as const;

    const handleActivity = () => {
      resetTimers();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimers();

    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
    // dialog는 context 안정 API, idle 시점에만 사용 — 타이머 재설정 방지 위해 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeout, warningTime]);

  return <>{children}</>;
}
