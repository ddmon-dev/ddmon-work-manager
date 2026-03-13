import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/shared/utils/classnames";

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

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
