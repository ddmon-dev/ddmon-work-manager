import { Skeleton } from "@/shared/ui/skeleton";
import { QueryError } from "@/shared/ui/query-error";
import { usePartnerList } from "../../partners/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface PartnerSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeIds?: string[];
  disabled?: boolean;
}

export function PartnerSelect({ value, onValueChange, excludeIds = [], disabled }: PartnerSelectProps) {
  const { data, isLoading, error, refetch } = usePartnerList({ pageSize: 200 });
  const options = (data?.items ?? []).filter((p) => !excludeIds.includes(p.id));
  const isEmpty = options.length === 0;

  if (isLoading) return <div role="status" aria-label="파트너 목록을 불러오고 있습니다"><Skeleton className="h-9 w-full" /></div>;
  if (error && !data) return <QueryError onRetry={() => void refetch()} message="파트너 목록을 불러오지 못했습니다." />;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isEmpty}>
      <SelectTrigger>
        <SelectValue placeholder={isEmpty ? "배치할 파트너가 없습니다." : "파트너를 선택해주세요."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
