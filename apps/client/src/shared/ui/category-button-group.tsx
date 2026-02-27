import * as React from "react";

import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { useQueryParams } from "@/shared/hooks/use-query-params";

interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryButtonGroupProps {
  options: CategoryOption[];
  paramKey?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

export function CategoryButtonGroup({
  options,
  paramKey = 'category',
  showAllOption = true,
  allOptionLabel = '전체',
  className,
  size = 'default',
}: CategoryButtonGroupProps) {
  const { get, set } = useQueryParams();
  const [value, setValue] = React.useState(get(paramKey) || 'all');

  React.useEffect(() => {
    const categoryValue = get(paramKey);
    setValue(categoryValue || 'all');
  }, [get, paramKey]);

  const handleValueChange = (newValue: string) => {
    if (!newValue) return;

    setValue(newValue);
    if (newValue === 'all') {
      set({ [paramKey]: '', page: '1' });
    } else {
      set({ [paramKey]: newValue, page: '1' });
    }
  };

  return (
    <ToggleGroup
      type='single'
      value={value}
      variant='outline'
      size={size}
      onValueChange={handleValueChange}
      className={className}
    >
      {showAllOption && <ToggleGroupItem value='all'>{allOptionLabel}</ToggleGroupItem>}
      {options.map(option => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
