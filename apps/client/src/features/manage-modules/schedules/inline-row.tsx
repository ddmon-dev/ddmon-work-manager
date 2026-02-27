import { Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

export const INLINE_INPUT =
  "border-transparent bg-input/30 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px] shadow-none px-2 text-sm";

export function InlineRow({
  label,
  children,
  error,
  saving,
  center,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  saving?: boolean;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[5rem_1fr] gap-x-4 text-sm py-2",
        center ? "items-center" : "items-start"
      )}
    >
      <span className="text-muted-foreground shrink-0 flex items-center gap-1.5 h-8 leading-8">
        {label}
        {saving && <Loader2 className="size-3 animate-spin" />}
      </span>
      <div className="min-w-0">
        {children}
        {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}
