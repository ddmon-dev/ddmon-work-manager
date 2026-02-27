import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/utils/classnames";

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden',
  {
    variants: {
      variant: {
        // 기본
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 dark:bg-primary-light dark:text-primary-light-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',

        // 시맨틱 Solid
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive-light dark:text-destructive-light-foreground',
        success:
          'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90 focus-visible:ring-success/20 dark:focus-visible:ring-success/40 dark:bg-success-light dark:text-success-light-foreground',
        warning:
          'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 dark:bg-warning-light dark:text-warning-light-foreground',
        info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90 focus-visible:ring-info/20 dark:focus-visible:ring-info/40 dark:bg-info-light dark:text-info-light-foreground',

        // Soft (연한 배경)
        'default-light':
          'border-transparent bg-primary-light text-primary-light-foreground [a&]:hover:bg-primary-light/80 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40',
        'destructive-light':
          'border-transparent bg-destructive-light text-destructive-light-foreground [a&]:hover:bg-destructive-light/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        'success-light':
          'border-transparent bg-success-light text-success-light-foreground [a&]:hover:bg-success-light/80 focus-visible:ring-success/20 dark:focus-visible:ring-success/40',
        'warning-light':
          'border-transparent bg-warning-light text-warning-light-foreground [a&]:hover:bg-warning-light/80 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40',
        'info-light':
          'border-transparent bg-info-light text-info-light-foreground [a&]:hover:bg-info-light/80 focus-visible:ring-info/20 dark:focus-visible:ring-info/40',

        // Outline (테두리만)
        'muted-outline':
          'border-muted-foreground/30 text-muted-foreground [a&]:hover:bg-muted',
        'info-outline':
          'border-info/40 text-info-light-foreground [a&]:hover:bg-info-light/30',
        'warning-outline':
          'border-warning/40 text-warning-light-foreground [a&]:hover:bg-warning-light/30',
        'success-outline':
          'border-success/40 text-success-light-foreground [a&]:hover:bg-success-light/30',

        // 무채색
        muted:
          'border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted-dark',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
