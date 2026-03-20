import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

interface YearFilterProps {
  value: number;
  onChange: (year: number) => void;
}

export function YearFilter({ value, onChange }: YearFilterProps) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
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
