import { useState, useCallback, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

interface CopyButtonProps {
  value: string;
  className?: string;
  children?: ReactNode;
}

export function CopyButton({ value, className, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const iconClass = cn(
    "shrink-0 text-muted-foreground hover:text-foreground transition-colors",
    copied && "text-green-500 hover:text-green-500",
  );

  if (children) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={cn("inline-flex items-center gap-1 min-w-0 cursor-pointer", className)}
        onClick={handleCopy}
        onKeyDown={(e) => e.key === "Enter" && handleCopy()}
      >
        <span className="truncate">{children}</span>
        <span className={iconClass}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-colors",
        copied && "text-green-500 hover:text-green-500",
        className,
      )}
      onClick={handleCopy}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
