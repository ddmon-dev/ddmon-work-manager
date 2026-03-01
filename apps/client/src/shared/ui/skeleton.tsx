import { cn } from "@/shared/utils/classnames";

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn(
        'animate-shimmer rounded-md bg-linear-to-r from-muted via-muted-foreground/15 to-muted bg-size-[300%_100%] animate-duration-[1.5s]!',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
