import { useEffect, useState } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/shared/utils/classnames";
import { Input } from "@/shared/ui/input";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

export interface FormNumberInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> extends FormBaseProps<V, N> {
  placeholder?: string;
  suffix?: string;
  thousandSeparator?: boolean;
  allowDecimal?: boolean;
  disabled?: boolean;
}

function toDisplay(value: number | undefined | null, thousandSeparator: boolean): string {
  if (value === undefined || value === null || isNaN(Number(value))) return "";
  if (thousandSeparator) return Number(value).toLocaleString("ko-KR");
  return String(value);
}

function parseRawInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function FormNumberInput<
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
  placeholder,
  suffix,
  thousandSeparator = false,
  disabled,
}: FormNumberInputProps<V, N>) {
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
        <NumberInputInner
          id={id}
          value={value}
          onChange={onChange}
          fieldState={fieldState}
          placeholder={placeholder}
          suffix={suffix}
          thousandSeparator={thousandSeparator}
          disabled={disabled}
        />
      )}
    </FormField>
  );
}

function NumberInputInner({
  id,
  value,
  onChange,
  fieldState,
  placeholder,
  suffix,
  thousandSeparator,
  disabled,
}: {
  id: string;
  value: number | undefined | null;
  onChange: (val: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldState: any;
  placeholder?: string;
  suffix?: string;
  thousandSeparator?: boolean;
  disabled?: boolean;
}) {
  const [display, setDisplay] = useState(() => toDisplay(value, !!thousandSeparator));

  useEffect(() => {
    setDisplay(toDisplay(value, !!thousandSeparator));
  }, [value, thousandSeparator]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,\-]/g, "");
    setDisplay(raw);
    const num = parseRawInput(raw);
    onChange(num);
  };

  const handleBlur = () => {
    setDisplay(toDisplay(parseRawInput(display), !!thousandSeparator));
  };

  if (suffix) {
    return (
      <div className="relative flex items-center">
        <Input
          id={id}
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-invalid={fieldState.invalid}
          disabled={disabled}
          className={cn("pr-8")}
        />
        <span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">{suffix}</span>
      </div>
    );
  }

  return (
    <Input
      id={id}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-invalid={fieldState.invalid}
      disabled={disabled}
    />
  );
}
