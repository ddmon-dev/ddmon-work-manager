import { Radar } from "lucide-react";
import { cn } from '../utils/classnames';
import Link from 'next/link';

export function ProjectSymbol({
  className,
  linkToHome,
}: {
  className?: string;
  linkToHome?: boolean;
}) {
  return (
    <Wrapper
      className={cn(
        'inline-flex items-center justify-center text-primary-foreground bg-foreground/80 size-[2.5em] rounded-[0.8em] shrink-0 dark:bg-primary-light dark:text-primary-light-foreground',
        className
      )}
      linkToHome={linkToHome}
    >
      <Radar className={cn('size-[1.5em]')} />
    </Wrapper>
  );
}

function Wrapper({
  children,
  className,
  linkToHome,
}: {
  children: React.ReactNode;
  className?: string;
  linkToHome?: boolean;
}) {
  if (linkToHome) {
    return (
      <Link href="/" className={cn(className)}>
        {children}
      </Link>
    );
  }
  return <div className={cn(className)}>{children}</div>;
}
