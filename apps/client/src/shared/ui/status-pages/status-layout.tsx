import { cn } from '@/shared/utils/classnames';
import { cva } from 'class-variance-authority';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/shared/ui/empty';

export type StatusSize = 'sm' | 'md' | 'lg';

interface StatusLayoutProps {
  code: string;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
  fullScreen?: boolean;
  size?: StatusSize;
}

const sizeVariants = cva('', {
  variants: {
    media: {
      sm: 'mb-2',
      md: 'mb-3',
      lg: 'mb-4',
    },
    code: {
      sm: 'text-6xl',
      md: 'text-7xl',
      lg: 'text-8xl',
    },
    title: {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
    },
    description: {
      sm: 'text-sm',
      md: 'text-md',
      lg: 'text-lg',
    },
    actions: {
      sm: '[&_button,&_a]:w-26',
      md: '[&_button,&_a]:w-28',
      lg: '[&_button,&_a]:w-32',
    },
  },
});

export function StatusLayout({
  code,
  title,
  description,
  actions,
  fullScreen = false,
  size = 'md',
}: StatusLayoutProps) {
  return (
    <Empty className={cn('border-0 gap-8 break-keep', fullScreen ? 'min-h-dvh' : 'flex-1')}>
      <EmptyHeader>
        <EmptyMedia className={cn(sizeVariants({ media: size }))}>
          <span
            className={cn(
              'text-8xl font-tertiary font-medium tracking-tighter text-muted-foreground/50',
              sizeVariants({ code: size })
            )}
          >
            {code}
          </span>
        </EmptyMedia>
        <EmptyTitle className={cn(sizeVariants({ title: size }))}>{title}</EmptyTitle>
        <EmptyDescription className={cn(sizeVariants({ description: size }))}>
          {description}
        </EmptyDescription>
      </EmptyHeader>

      {actions && (
        <EmptyContent className={cn(sizeVariants({ actions: size }))}>{actions}</EmptyContent>
      )}
    </Empty>
  );
}
