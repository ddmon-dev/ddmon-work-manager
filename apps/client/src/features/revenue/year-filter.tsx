import { useNavigate, useSearchParams } from "react-router";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentYear = searchParams.get("year") ?? String(CURRENT_YEAR);

  function handleChange(value: string) {
    navigate(`/revenue?year=${value}`);
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
