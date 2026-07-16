import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { CopyButton } from "@/shared/ui/copy-button";

interface DetailSectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DetailSectionTitle({
  children,
  className,
}: DetailSectionTitleProps) {
  return (
    <h3 className={cn("text-md font-semibold mb-2", className)}>{children}</h3>
  );
}

interface DetailInfoRowProps {
  className?: string;
  label: string;
  value: React.ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  vertical?: boolean;
  copyable?: boolean;
  masked?: boolean;
}

export function DetailInfoRow({
  className,
  label,
  value,
  labelClassName,
  valueClassName,
  vertical,
  copyable,
  masked,
}: DetailInfoRowProps) {
  const [revealed, setRevealed] = useState(false);

  const hasValue = value !== null && value !== undefined && value !== "";
  const displayValue = !hasValue
    ? "-"
    : masked && !revealed
      ? "••••••••"
      : value;

  return (
    <div
      className={cn(
        "flex justify-between gap-y-2 gap-x-8 text-sm py-1.5",
        vertical ? "flex-col gap-y-1" : "items-baseline",
        className
      )}
    >
      <span className={cn("text-muted-foreground shrink-0 truncate", labelClassName)}>
        {label}
      </span>
      {hasValue && (copyable || masked) ? (
        <span className="flex min-w-0 max-w-48 items-center gap-1">
          {copyable ? (
            <CopyButton value={String(value)} className={cn("min-w-0 text-right", valueClassName)}>
              {displayValue}
            </CopyButton>
          ) : (
            <span className={cn("truncate text-right", valueClassName)}>
              {displayValue}
            </span>
          )}
          {masked && (
            <button
              type="button"
              className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "값 숨기기" : "값 표시"}
            >
              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          )}
        </span>
      ) : (
        <span className={cn("text-right truncate max-w-48", valueClassName)}>
          {displayValue}
        </span>
      )}
    </div>
  );
}
