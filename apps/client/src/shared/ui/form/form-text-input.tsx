import { ReactElement, useState, useEffect } from "react";
import {
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
  type ControllerFieldState,
} from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { FormField } from "./form-field";
import type { FormBaseProps, ExcludedFormProps } from "./types";

export type FormTextInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormBaseProps<V, N> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, ExcludedFormProps | "type"> & {
    customFilter?: (value: string) => string;
    valueTransform?: (displayValue: string) => string;
  };

type TextInputFieldProps = {
  field: Omit<ControllerRenderProps, "onChange">;
  fieldState: ControllerFieldState;
  onChange: (value: string) => void;
  customFilter?: (value: string) => string;
  valueTransform?: (displayValue: string) => string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

const TextInputField = ({
  field,
  fieldState,
  onChange,
  customFilter,
  valueTransform,
  inputProps,
}: TextInputFieldProps): ReactElement => {
  const [displayValue, setDisplayValue] = useState(field.value || "");

  useEffect(() => {
    const rawValue = field.value || "";
    setDisplayValue(customFilter ? customFilter(rawValue) : rawValue);
  }, [field.value, customFilter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const newDisplayValue = customFilter ? customFilter(inputValue) : inputValue;
    setDisplayValue(newDisplayValue);
    const transformedValue = valueTransform
      ? valueTransform(newDisplayValue)
      : newDisplayValue;
    onChange(transformedValue);
  };

  return (
    <Input
      {...field}
      value={displayValue}
      onChange={handleChange}
      aria-invalid={fieldState.invalid}
      {...inputProps}
    />
  );
};

export const FormTextInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({
  control,
  name,
  label,
  description,
  orientation,
  optional,
  customFilter,
  valueTransform,
  disableError,
  ...inputProps
}: FormTextInputProps<V, N>): ReactElement => {
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
      {({ onChange, fieldState, ...field }) => (
        <TextInputField
          field={field}
          fieldState={fieldState}
          onChange={onChange}
          customFilter={customFilter}
          valueTransform={valueTransform}
          inputProps={inputProps}
        />
      )}
    </FormField>
  );
};
