import { cn } from "@/shared/utils/classnames";
import { Separator } from "@/shared/ui/separator";

interface DividerWithTextProps {
  text?: string;
  className?: string;
}

export function DividerWithText({ text = '또는', className }: DividerWithTextProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Separator className={cn('flex-1')} />
      <span className={cn('text-muted-foreground text-sm')}>{text}</span>
      <Separator className={cn('flex-1')} />
    </div>
  );
}
