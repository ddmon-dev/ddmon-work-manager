import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
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
}

export function CategoryButtonGroup({
  options,
  paramKey = 'category',
  showAllOption = true,
  allOptionLabel = '전체',
  className,
}: CategoryButtonGroupProps) {
  const { get, set } = useQueryParams();
  const defaultValue = showAllOption ? 'all' : options[0]?.value ?? 'all';
  const [value, setValue] = React.useState(get(paramKey) || defaultValue);

  React.useEffect(() => {
    const categoryValue = get(paramKey);
    setValue(categoryValue || defaultValue);
  }, [get, paramKey, defaultValue]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    if (newValue === 'all') {
      set({ [paramKey]: '', page: '1' });
    } else {
      set({ [paramKey]: newValue, page: '1' });
    }
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange} className={className}>
      <TabsList>
        {showAllOption && <TabsTrigger value='all'>{allOptionLabel}</TabsTrigger>}
        {options.map(option => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
