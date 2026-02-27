import * as React from "react";
import { format, addDays, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X } from "lucide-react";
import { type Matcher, type DateRange } from "react-day-picker";

import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { RemovableBadgeGroup } from "@/shared/ui/removable-badge-group";

type DatePickerBaseProps = {
  placeholder?: string;
  disabled?: Matcher | Matcher[];
  fromDate?: Date;
  toDate?: Date;
  startMonth?: Date;
  endMonth?: Date;
  layout?: 'dropdown' | 'dropdown-months' | 'dropdown-years';
  showOutsideDays?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
};

type SingleDatePickerProps = DatePickerBaseProps & {
  mode?: 'single';
  value?: Date | null;
  onValueChange: (date: Date | undefined) => void;
  presets?: boolean | { label: string; date: Date }[];
};

type MultipleDatePickerProps = DatePickerBaseProps & {
  mode: 'multiple';
  value?: Date[] | null;
  onValueChange: (dates: Date[] | undefined) => void;
  min?: number;
  max?: number;
};

type RangeDatePickerProps = DatePickerBaseProps & {
  mode: 'range';
  value?: DateRange | null;
  onValueChange: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  min?: number;
  max?: number;
};

type DatePickerProps =
  | SingleDatePickerProps
  | MultipleDatePickerProps
  | RangeDatePickerProps;

export type {
  DatePickerBaseProps,
  SingleDatePickerProps,
  MultipleDatePickerProps,
  RangeDatePickerProps,
  DatePickerProps,
};

const DEFAULT_PRESETS = [
  { label: '오늘', date: new Date() },
  { label: '내일', date: addDays(new Date(), 1) },
  { label: '일주일 후', date: addDays(new Date(), 7) },
  { label: '한 달 후', date: addMonths(new Date(), 1) },
];

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (props, ref) => {
    const [open, setOpen] = React.useState(false);

    const currentYear = new Date().getFullYear();

    const {
      placeholder = '날짜 선택',
      disabled,
      fromDate,
      toDate,
      startMonth = new Date(currentYear - 100, 0),
      endMonth = new Date(currentYear + 100, 11),
      layout = 'dropdown',
      showOutsideDays = true,
      className,
      'aria-invalid': ariaInvalid,
    } = props;

    const mode = props.mode ?? 'single';

    const renderButtonText = () => {
      if (mode === 'single') {
        const { value } = props as SingleDatePickerProps;
        return value ? format(value, 'PPP', { locale: ko }) : placeholder;
      }

      if (mode === 'multiple') {
        const { value } = props as MultipleDatePickerProps;
        return value && value.length > 0
          ? `${value.length}개 선택됨`
          : placeholder;
      }

      if (mode === 'range') {
        const { value } = props as RangeDatePickerProps;
        if (value?.from) {
          if (value.to) {
            return `${format(value.from, 'PPP', { locale: ko })} - ${format(
              value.to,
              'PPP',
              {
                locale: ko,
              }
            )}`;
          }
          return format(value.from, 'PPP', { locale: ko });
        }
        return placeholder;
      }

      return placeholder;
    };

    const hasValue = () => {
      if (mode === 'single') {
        return !!(props as SingleDatePickerProps).value;
      }
      if (mode === 'multiple') {
        const value = (props as MultipleDatePickerProps).value;
        return value && value.length > 0;
      }
      if (mode === 'range') {
        return !!(props as RangeDatePickerProps).value?.from;
      }
      return false;
    };

    const renderCalendar = () => {
      if (mode === 'single') {
        const { value, onValueChange } = props as SingleDatePickerProps;
        return (
          <Calendar
            mode="single"
            defaultMonth={value ?? undefined}
            selected={value ?? undefined}
            onSelect={date => {
              onValueChange(date);
              setOpen(false);
            }}
            disabled={disabled}
            fromDate={fromDate}
            toDate={toDate}
            startMonth={startMonth}
            endMonth={endMonth}
            captionLayout={layout}
            showOutsideDays={showOutsideDays}
            locale={ko}
            autoFocus
          />
        );
      }

      if (mode === 'multiple') {
        const { value, onValueChange, min, max } =
          props as MultipleDatePickerProps;
        return (
          <Calendar
            mode="multiple"
            defaultMonth={value?.[0] ?? undefined}
            selected={value ?? undefined}
            onSelect={onValueChange}
            disabled={disabled}
            fromDate={fromDate}
            toDate={toDate}
            startMonth={startMonth}
            endMonth={endMonth}
            captionLayout={layout}
            showOutsideDays={showOutsideDays}
            locale={ko}
            min={min}
            max={max}
            autoFocus
          />
        );
      }

      if (mode === 'range') {
        const {
          value,
          onValueChange,
          numberOfMonths = 2,
          min,
          max,
        } = props as RangeDatePickerProps;
        return (
          <Calendar
            mode="range"
            defaultMonth={value?.from ?? undefined}
            selected={value ?? undefined}
            onSelect={onValueChange}
            disabled={disabled}
            fromDate={fromDate}
            toDate={toDate}
            startMonth={startMonth}
            endMonth={endMonth}
            captionLayout={layout}
            showOutsideDays={showOutsideDays}
            locale={ko}
            numberOfMonths={numberOfMonths}
            min={min}
            max={max}
            autoFocus
          />
        );
      }

      return null;
    };

    const renderPresets = () => {
      if (mode !== 'single') return null;

      const { presets, onValueChange } = props as SingleDatePickerProps;
      if (!presets) return null;

      const actualPresets = presets === true ? DEFAULT_PRESETS : presets;
      if (actualPresets.length === 0) return null;

      return (
        <div className="flex flex-wrap gap-1.5">
          {actualPresets.map((preset, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => {
                onValueChange(preset.date);
                setOpen(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      );
    };

    const hasPresets =
      mode === 'single' && !!(props as SingleDatePickerProps).presets;

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      if (mode === 'single') {
        (props as SingleDatePickerProps).onValueChange(undefined);
      } else if (mode === 'multiple') {
        (props as MultipleDatePickerProps).onValueChange(undefined);
      } else if (mode === 'range') {
        (props as RangeDatePickerProps).onValueChange(undefined);
      }
    };

    const renderMultipleBadges = () => {
      if (mode !== 'multiple') return null;

      const { value, onValueChange } = props as MultipleDatePickerProps;
      if (!value || value.length === 0) return null;

      return (
        <RemovableBadgeGroup
          items={value.map(date => ({
            key: date.toISOString(),
            label: format(date, 'PPP', { locale: ko }),
          }))}
          onRemove={key => {
            const dateToRemove = new Date(key);
            onValueChange(
              value.filter(d => d.getTime() !== dateToRemove.getTime())
            );
          }}
        />
      );
    };

    return (
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <div className="relative">
            <PopoverTrigger asChild>
              <Button
                ref={ref}
                variant="outline"
                aria-invalid={ariaInvalid}
                data-placeholder={!hasValue()}
                className={cn(
                  "border-input data-[placeholder=true]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-start gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-11 md:data-[size=default]:h-9 data-[size=sm]:h-10 md:data-[size=sm]:h-8 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                  'w-full hover:bg-background font-normal',
                  hasValue() && 'pr-8!',
                  className
                )}
              >
                <CalendarIcon className="opacity-50" />
                <span className="flex-1 text-left">{renderButtonText()}</span>
              </Button>
            </PopoverTrigger>
            {hasValue() && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-muted"
              >
                <X className="size-4 opacity-50 hover:opacity-100" />
              </button>
            )}
          </div>
          <PopoverContent
            className={cn(
              'w-auto p-0',
              hasPresets && 'flex flex-col space-y-2 p-2'
            )}
            align="start"
          >
            {renderPresets()}
            {hasPresets ? (
              <div className="rounded-md border">{renderCalendar()}</div>
            ) : (
              renderCalendar()
            )}
          </PopoverContent>
        </Popover>

        {renderMultipleBadges()}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
