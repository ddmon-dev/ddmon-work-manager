import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/shared/utils/classnames";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0')
);

function parseTime(value: string) {
  const [h, m] = value.split(':');
  return { hour: h ?? '', minute: m ?? '' };
}

function formatTime(hour: string, minute: string) {
  if (!hour && !minute) return '';
  return `${hour || '00'}:${minute || '00'}`;
}

function TimeColumn({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-value="${value}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [value]);

  return (
    <div ref={listRef} className="h-52 overflow-y-auto hide-scrollbar p-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          data-value={opt}
          className={cn(
            'w-full text-center text-sm px-2 py-1 rounded-sm transition-colors',
            value === opt
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-muted/50'
          )}
          onClick={() => onSelect(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

type TimePickerProps = {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function TimePicker({
  value = '',
  onValueChange,
  placeholder = '시간 선택',
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const { hour, minute } = parseTime(value);

  const handleSelect = (type: 'hour' | 'minute', v: string) => {
    const next =
      type === 'hour'
        ? formatTime(v, minute || '00')
        : formatTime(hour || '00', v);
    onValueChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-placeholder={!value}
          className={cn(
            "border-input data-[placeholder=true]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-start gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-11 md:data-[size=default]:h-9 data-[size=sm]:h-10 md:data-[size=sm]:h-8 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            'w-full hover:bg-background font-normal',
            className
          )}
        >
          <Clock className="opacity-50" />
          <span className="flex-1 text-left">{value || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          <div className="w-16">
            <p className="text-xs text-muted-foreground text-center py-1.5 border-b">
              시
            </p>
            <TimeColumn
              options={HOURS}
              value={hour}
              onSelect={v => handleSelect('hour', v)}
            />
          </div>
          <div className="w-16">
            <p className="text-xs text-muted-foreground text-center py-1.5 border-b">
              분
            </p>
            <TimeColumn
              options={MINUTES}
              value={minute}
              onSelect={v => handleSelect('minute', v)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
