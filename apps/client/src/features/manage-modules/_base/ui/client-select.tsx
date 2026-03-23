import { useFormContext } from "react-hook-form";
import { useClientList } from "../../clients/api";
import { FormSelect } from "@/shared/ui/form";

interface ClientSelectProps {
  disabled?: boolean;
  description?: string;
  optional?: boolean;
  onValueChange?: (value: string, label: string) => void;
}

export function ClientSelect({ disabled, description, optional, onValueChange }: ClientSelectProps) {
  const { control } = useFormContext();
  const { data } = useClientList({ pageSize: 200 });
  const options = data?.items.map((c) => ({ value: c.id, label: c.companyName })) ?? [];

  return (
    <FormSelect
      control={control}
      name="clientId"
      label="클라이언트"
      placeholder="클라이언트를 선택해주세요."
      description={description}
      options={options}
      optional={optional}
      disabled={disabled}
      onValueChange={
        onValueChange
          ? (value: string) => {
              const matched = options.find((o) => o.value === value);
              if (matched) onValueChange(matched.value, matched.label);
            }
          : undefined
      }
    />
  );
}
