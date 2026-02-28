import { Skeleton } from '@/shared/ui/skeleton';

interface ListSkeletonProps {
  rows?: number;
}

export function ListSkeleton({ rows = 10 }: ListSkeletonProps) {
  return (
    <div className='flex flex-col flex-1 min-h-0'>
      {/* Total count skeleton */}
      <div className='flex items-center justify-between mb-3'>
        <Skeleton className='h-4 w-20' />
      </div>

      {/* Table skeleton */}
      <div className='overflow-hidden rounded-md border'>
        <div className='bg-background-secondary'>
          {/* Header */}
          <div className='flex items-center gap-4 border-b p-3'>
            {/* Checkbox */}
            <Skeleton className='size-4 rounded-sm shrink-0' />
            {/* Title (wide) */}
            <Skeleton className='h-4 w-16 shrink-0' />
            {/* Other columns */}
            <div className='flex-1' />
            <Skeleton className='h-4 w-12 shrink-0' />
            <Skeleton className='h-4 w-16 shrink-0' />
            <Skeleton className='h-4 w-12 shrink-0' />
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className='flex items-center gap-4 border-b last:border-b-0 p-3'
          >
            {/* Checkbox */}
            <Skeleton className='size-6 rounded-sm shrink-0' />
            {/* Title (varies) */}
            <Skeleton
              className='h-6 shrink-0'
              style={{ width: `${200 + (rowIndex % 4) * 50}px` }}
            />
            {/* Spacer */}
            <div className='flex-1' />
            {/* Status badge */}
            <Skeleton className='h-6 w-14 rounded-full shrink-0' />
            {/* Date */}
            <Skeleton className='h-4 w-20 shrink-0' />
            {/* Action */}
            <Skeleton className='size-8 rounded-md shrink-0' />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className='sticky bottom-0 bg-background flex items-center justify-center border-t p-4 -mx-4 rounded-b-lg md:justify-between mt-auto'>
        <div className='flex items-center gap-1'>
          <Skeleton className='size-9 rounded-md' />
          <Skeleton className='size-9 rounded-md' />
          <Skeleton className='size-9 rounded-md' />
          <Skeleton className='size-9 rounded-md' />
          <Skeleton className='size-9 rounded-md' />
        </div>
        <Skeleton className='h-9 w-20 hidden md:block' />
      </div>
    </div>
  );
}
