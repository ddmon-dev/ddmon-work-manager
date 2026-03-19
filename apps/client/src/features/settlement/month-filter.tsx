import { useQueryParams } from "@/shared/hooks/use-query-params";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface MonthFilterProps {
  year: number;
  month: number;
}

export function MonthFilter({ year, month }: MonthFilterProps) {
  const { set } = useQueryParams();

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        value={String(year)}
        onChange={(e) => set({ year: e.target.value, month: String(month) })}
      >
        {YEAR_OPTIONS.map((y) => (
          <NativeSelectOption key={y} value={String(y)}>
            {y}년
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        value={String(month)}
        onChange={(e) => set({ year: String(year), month: e.target.value })}
      >
        {MONTH_OPTIONS.map((m) => (
          <NativeSelectOption key={m} value={String(m)}>
            {m}월
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
