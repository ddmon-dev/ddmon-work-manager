import type { FieldPath, FieldValues } from "react-hook-form";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

export interface FormNativeSelectProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> extends FormBaseProps<V, N> {
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}

export function FormNativeSelect<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({ control, name, label, description, orientation, optional, disableError, options, disabled }: FormNativeSelectProps<V, N>) {
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
        <NativeSelect
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={fieldState.invalid}
          disabled={disabled}
        >
          {options.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}
