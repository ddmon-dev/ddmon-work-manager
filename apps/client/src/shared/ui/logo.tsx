import { cn } from '../utils/classnames';
import { Link } from 'react-router';

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
      <span className="text-[1.4em] font-semibold leading-none">W</span>
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
      <Link to="/" className={cn(className)}>
        {children}
      </Link>
    );
  }
  return <div className={cn(className)}>{children}</div>;
}
