import { APP_CONFIG } from "@/app.config";
import { cn } from "@/shared/utils/classnames";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface PageSizeSelectProps {
  paramKey?: string;
  options?: readonly number[];
  className?: string;
}

export function PageSizeSelect({
  paramKey = "pageSize",
  options = APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS,
  className,
}: PageSizeSelectProps) {
  const { get, set } = useQueryParams();
  const pageSize = get(paramKey) || options[0].toString();

  const handlePageSizeChange = (value: string) => {
    set({ [paramKey]: value, page: "1" });
  };

  return (
    <Select value={pageSize} onValueChange={handlePageSizeChange}>
      <SelectTrigger className={cn("w-32", className)}>
        <SelectValue placeholder="페이지 크기" />
      </SelectTrigger>
      <SelectContent>
        {options.map((value) => (
          <SelectItem key={value} value={value.toString()}>
            {value} 개씩 보기
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
