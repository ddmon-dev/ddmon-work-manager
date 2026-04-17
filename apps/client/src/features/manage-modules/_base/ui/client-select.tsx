import { useFormContext } from "react-hook-form";
import { useClientList } from "../../clients/api";
import { FormSelect } from "@/shared/ui/form";

interface ClientSelectProps {
  name?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  description?: string;
  optional?: boolean;
  excludeId?: string;
  onValueChange?: (value: string, label: string) => void;
}

export function ClientSelect({
  name = "clientId",
  label = "클라이언트",
  placeholder = "클라이언트를 선택해주세요.",
  disabled,
  description,
  optional,
  excludeId,
  onValueChange,
}: ClientSelectProps) {
  const { control } = useFormContext();
  const { data } = useClientList({ pageSize: 200 });
  const options = (data?.items.map((c) => ({ value: c.id, label: c.companyName })) ?? [])
    .filter((o) => !excludeId || o.value !== excludeId);

  return (
    <FormSelect
      control={control}
      name={name}
      label={label}
      placeholder={placeholder}
      description={description}
      options={options}
      optional={optional}
      clearable={optional}
      disabled={disabled}
      onValueChange={
        onValueChange
          ? (value: string) => {
              const matched = options.find((o) => o.value === value);
              onValueChange(matched?.value ?? "", matched?.label ?? "");
            }
          : undefined
      }
    />
  );
}
