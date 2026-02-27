import type { FieldPath, FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

export interface SelectOption {
  value: string;
  label: string;
}

export type FormSelectProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormBaseProps<V, N> & {
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export function FormSelect<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({
  control,
  name,
  label,
  description,
  orientation,
  optional,
  disableError,
  options,
  placeholder,
  disabled,
  onValueChange,
}: FormSelectProps<V, N>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      orientation={orientation}
      optional={optional}
      disableError={disableError}
    >
      {({ value, onChange, fieldState, id }) => (
        <Select
          value={value ?? ""}
          onValueChange={(v) => { onChange(v); onValueChange?.(v); }}
          disabled={disabled}
        >
          <SelectTrigger id={id} aria-invalid={fieldState.invalid}>
            <SelectValue placeholder={placeholder ?? "선택해주세요."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}
