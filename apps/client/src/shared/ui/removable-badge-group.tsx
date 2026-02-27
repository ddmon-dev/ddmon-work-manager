import { X } from "lucide-react";

import { Badge } from "@/shared/ui/badge";

type RemovableBadgeGroupProps = {
  items: Array<{ key: string; label: string }>;
  onRemove: (key: string) => void;
  variant?: 'default' | 'secondary';
};

export function RemovableBadgeGroup({
  items,
  onRemove,
  variant = 'default',
}: RemovableBadgeGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-1'>
      {items.map((item, index) => (
        <Badge
          key={`${item.key}-${index}`}
          variant={variant}
          className='gap-1 pr-1'
        >
          {item.label}
          <button
            type='button'
            onClick={() => onRemove(item.key)}
            className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 hover:text-destructive'
          >
            <X className='h-3 w-3' />
          </button>
        </Badge>
      ))}
    </div>
  );
}
