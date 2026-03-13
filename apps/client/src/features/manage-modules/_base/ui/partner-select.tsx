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
  const { data } = usePartnerList({ pageSize: 200 });
  const options = (data?.items ?? []).filter((p) => !excludeIds.includes(p.id));
  const isEmpty = options.length === 0;

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
