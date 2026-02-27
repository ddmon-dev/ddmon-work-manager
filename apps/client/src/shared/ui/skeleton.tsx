import { cn } from "@/shared/utils/classnames";

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn(
        'animate-shimmer rounded-md bg-linear-to-r from-muted via-muted-foreground/10 to-muted animate-duration-2000!',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
