import { Button } from "./button";

export function QueryError({ onRetry, message = "데이터를 불러오지 못했습니다.", floating = false }: {
  onRetry?: () => void;
  message?: string;
  floating?: boolean;
}) {
  return (
    <div role="alert" className={`flex flex-wrap items-center justify-center gap-3 rounded-md border border-destructive/30 p-4 text-sm ${floating ? "fixed right-4 top-4 z-50 max-w-sm bg-background shadow-md" : "bg-destructive/5"}`}>
      <span>{message}</span>
      {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}
