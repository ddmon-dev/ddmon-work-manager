import * as React from "react";

import { cn } from "@/shared/utils/classnames";

function Textarea({
  className,
  compact,
  ...props
}: React.ComponentProps<'textarea'> & { compact?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content w-full rounded-md border bg-transparent px-3 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        compact
          ? 'min-h-11 md:min-h-9 min-w-0 py-[calc((2.75rem-1lh)/2)] md:py-[calc((2.25rem-1lh)/2)] selection:bg-primary selection:text-primary-foreground'
          : 'min-h-[164px] md:min-h-[150px] py-2',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
