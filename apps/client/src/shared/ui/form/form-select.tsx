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
  clearable?: boolean;
  onValueChange?: (value: string) => void;
};

const CLEAR_VALUE = "__clear__";

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
  clearable,
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
          onValueChange={(v) => {
            if (v === CLEAR_VALUE) {
              onChange(null);
              onValueChange?.("");
            } else {
              onChange(v);
              onValueChange?.(v);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger id={id} aria-invalid={fieldState.invalid}>
            <SelectValue placeholder={placeholder ?? "선택해주세요."} />
          </SelectTrigger>
          <SelectContent>
            {clearable && (
              <SelectItem value={CLEAR_VALUE} className="text-muted-foreground">
                {placeholder ?? "선택해주세요."}
              </SelectItem>
            )}
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
