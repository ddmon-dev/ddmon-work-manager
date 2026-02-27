import { cn } from "@/shared/utils/classnames";

interface BaseProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetBody({ children, className }: BaseProps) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        'hide-scrollbar lg:flex-1 lg:min-h-0 grid grid-cols-1 lg:divide-x',
        '[&_form]:flex-1 [&_form]:flex [&_form]:flex-col [&_form]:min-h-0',
        'not-has-data-[slot="sheet-scroll-column"]:overflow-y-auto',
        'not-has-data-[slot="sheet-scroll-column"]:divide-y',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SheetScrollColumn({ children, className }: BaseProps) {
  return (
    <div
      data-slot="sheet-scroll-column"
      className={cn('overflow-y-auto hide-scrollbar divide-y', className)}
    >
      {children}
    </div>
  );
}

export function SheetContainer({ children, className }: BaseProps) {
  return (
    <div
      data-slot="sheet-container"
      className={cn('px-4 md:px-8 py-5', className)}
    >
      {children}
    </div>
  );
}
