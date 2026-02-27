import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/shared/utils/classnames";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // 기본
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary-light dark:text-primary-light-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive-light dark:text-destructive-light-foreground",
        outline:
          "text-foreground border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary/60 dark:hover:bg-secondary/60",
        link: "text-primary underline-offset-4 hover:underline",

        // 시맨틱 Solid
        success:
          "bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success/20 dark:focus-visible:ring-success/40 dark:bg-success-light dark:text-success-light-foreground",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 dark:bg-warning-light dark:text-warning-light-foreground",
        info: "bg-info text-info-foreground hover:bg-info/90 focus-visible:ring-info/20 dark:focus-visible:ring-info/40 dark:bg-info-light dark:text-info-light-foreground",

        // Soft (연한 배경)
        "default-light":
          "bg-primary-light text-primary-light-foreground hover:bg-primary-light/80 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40",
        "destructive-light":
          "bg-destructive-light text-destructive-light-foreground hover:bg-destructive-light/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        "success-light":
          "bg-success-light text-success-light-foreground hover:bg-success-light/80 focus-visible:ring-success/20 dark:focus-visible:ring-success/40",
        "warning-light":
          "bg-warning-light text-warning-light-foreground hover:bg-warning-light/80 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40",
        "info-light":
          "bg-info-light text-info-light-foreground hover:bg-info-light/80 focus-visible:ring-info/20 dark:focus-visible:ring-info/40",

        // Outlines
        "default-outline":
          "border border-primary text-primary hover:opacity-70 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40 bg-primary-light",
        "destructive-outline":
          "border border-destructive text-destructive hover:opacity-70 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        "success-outline":
          "border border-success text-success hover:opacity-70 focus-visible:ring-success/20 dark:focus-visible:ring-success/40",
        "warning-outline":
          "border border-warning text-warning hover:opacity-70 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40",
        "info-outline":
          "border border-info text-info hover:opacity-70 focus-visible:ring-info/20 dark:focus-visible:ring-info/40",

        // Light Ghosts
        "default-light-ghost":
          "text-primary-light-foreground hover:bg-primary-light/80 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40",
        "destructive-light-ghost":
          "text-destructive-light-foreground hover:bg-destructive-light/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        "success-light-ghost":
          "text-success-light-foreground hover:bg-success-light/80 focus-visible:ring-success/20 dark:focus-visible:ring-success/40",
        "warning-light-ghost":
          "text-warning-light-foreground hover:bg-warning-light/80 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40",
        "info-light-ghost":
          "text-info-light-foreground hover:bg-info-light/80 focus-visible:ring-info/20 dark:focus-visible:ring-info/40",

        // 무채색
        muted: "bg-muted text-muted-foreground hover:bg-muted-dark",
        black:
          "bg-foreground/80 text-background hover:bg-foreground/60 dark:bg-foreground dark:hover:bg-foreground/80",
      },
      size: {
        xs: "h-8 md:h-7 gap-1.5 px-2.5 has-[>svg]:px-2.5 text-xs",
        default: "h-11 md:h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-10 md:h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 md:h-10 px-6 has-[>svg]:px-4 text-md font-medium",
        icon: "size-11 md:size-9",
        "icon-xs": "size-8 md:size-7",
        "icon-sm": "size-10 md:size-8",
        "icon-lg": "size-12 md:size-10",
      },
      rounded: {
        default: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  rounded,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, rounded, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
