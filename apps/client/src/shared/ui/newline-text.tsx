import { cn } from "@/shared/utils/classnames";

interface NewlineTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

export function NewlineText({
  children,
  className,
  as: Component = 'span',
}: NewlineTextProps) {
  return (
    <Component className={cn('whitespace-pre-line', className)}>
      {children}
    </Component>
  );
}
