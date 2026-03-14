import { useQueryParams } from "@/shared/hooks/use-query-params";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export function YearFilter() {
  const { get, set } = useQueryParams();
  const currentYear = get("year") ?? String(CURRENT_YEAR);

  function handleChange(value: string) {
    set({ year: value });
  }

  return (
    <Select value={currentYear} onValueChange={handleChange}>
      <SelectTrigger className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {YEAR_OPTIONS.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}년
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
