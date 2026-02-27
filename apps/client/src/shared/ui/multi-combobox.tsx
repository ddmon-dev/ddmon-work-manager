import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { RemovableBadgeGroup } from "@/shared/ui/removable-badge-group";

type MultiComboboxProps = {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  'aria-invalid'?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
  disabled?: boolean;
};

export function MultiCombobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search',
  emptyMessage = 'No results found',
  className,
  'aria-invalid': ariaInvalid,
  ref,
  disabled = false,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      onValueChange(value.filter(v => v !== selectedValue));
    } else {
      onValueChange([...value, selectedValue]);
    }
  };

  const handleRemove = (valueToRemove: string) => {
    onValueChange(value.filter(v => v !== valueToRemove));
  };

  return (
    <div className="space-y-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            data-placeholder={value?.length === 0}
            disabled={disabled}
            className={cn(
              'w-full hover:bg-background',
              "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-11 md:data-[size=default]:h-9 data-[size=sm]:h-10 md:data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              className
            )}
          >
            {value.length > 0 ? `${value.length}개 선택됨` : placeholder}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        'ml-auto',
                        value.includes(option.value)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <RemovableBadgeGroup
        items={value.map(v => ({
          key: v,
          label: options.find(o => o.value === v)?.label ?? v,
        }))}
        onRemove={handleRemove}
      />
    </div>
  );
}
