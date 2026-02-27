import { cn } from '../utils/classnames';

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('px-4 w-full mx-auto', className)}>{children}</div>;
}
