import { cn } from "@/shared/utils/classnames";

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
}

export function DetailInfoRow({
  className,
  label,
  value,
  labelClassName,
  valueClassName,
  vertical,
}: DetailInfoRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-y-2 gap-x-8 text-sm py-1.5",
        vertical ? "flex-col gap-y-1" : "items-baseline",
        className
      )}
    >
      <span className={cn("text-muted-foreground shrink-0", labelClassName)}>
        {label}
      </span>
      <span className={cn("text-right text-balance", valueClassName)}>
        {value ?? "-"}
      </span>
    </div>
  );
}
