import { cn } from "@/shared/utils/classnames";

interface DemoOverlayProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 데모 모드에서 특정 영역을 backdrop-blur로 덮어 "차단됨"을 시각화하는 공용 오버레이 shell.
 *
 * `relative` 부모 안에 배치해 사용한다. 기본으로 부모보다 살짝 크게(`-inset-3`) 덮어
 * "떠 있는 프로스티드 패널" 느낌을 준다. className으로 덮어쓸 수 있다(예: 로그인 폼은 `-inset-8`).
 * 표시 여부(IS_DEMO) 판단은 호출부에서 한다.
 */
export function DemoOverlay({ children, className }: DemoOverlayProps) {
  return (
    <div
      className={cn(
        "absolute -inset-3 z-10 flex flex-col items-center justify-center gap-3 rounded-md",
        "backdrop-blur-[5px] shadow-[0_0_5px_-1px_rgb(0,0,0,0.1)] dark:shadow-[0_0_5px_-1px_rgb(255,255,255,0.1)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** 데모 오버레이 안에 쓰는 안내 문구. 버튼과 동일한 라운드를 사용한다. */
export function DemoOverlayMessage({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-foreground/5 dark:bg-foreground/10 px-4.5 py-2.5 text-sm font-medium text-foreground shadow-xs">
      {children}
    </span>
  );
}
