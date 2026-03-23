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
}

export function DetailInfoRow({
  className,
  label,
  value,
  labelClassName,
  valueClassName,
  vertical,
  copyable,
}: DetailInfoRowProps) {
  const displayValue = value ?? "-";
  const hasValue = value !== null && value !== undefined && value !== "";

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
      <span className={cn("text-right truncate flex items-center gap-1 min-w-0", valueClassName)}>
        <span className="truncate">{displayValue}</span>
        {copyable && hasValue && (
          <CopyButton value={String(value)} className="shrink-0" />
        )}
      </span>
    </div>
  );
}
