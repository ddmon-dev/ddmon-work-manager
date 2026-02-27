import { ReactElement } from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { DatePicker, type DatePickerBaseProps } from "@/shared/ui/date-picker";
import { type DateRange } from "react-day-picker";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

type FormDatePickerBaseProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormBaseProps<V, N> &
  Omit<DatePickerBaseProps, "aria-invalid" | "className">;

type FormSingleDatePickerProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormDatePickerBaseProps<V, N> & {
  mode?: "single";
  presets?: boolean | { label: string; date: Date }[];
};

type FormMultipleDatePickerProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormDatePickerBaseProps<V, N> & {
  mode: "multiple";
  min?: number;
  max?: number;
};

type FormRangeDatePickerProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormDatePickerBaseProps<V, N> & {
  mode: "range";
  numberOfMonths?: number;
  min?: number;
  max?: number;
};

export type FormDatePickerProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> =
  | FormSingleDatePickerProps<V, N>
  | FormMultipleDatePickerProps<V, N>
  | FormRangeDatePickerProps<V, N>;

export const FormDatePicker = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>(
  props: FormDatePickerProps<V, N>
): ReactElement => {
  const {
    control,
    name,
    label,
    description,
    orientation,
    placeholder,
    disabled,
    fromDate,
    toDate,
    startMonth,
    endMonth,
    layout,
    showOutsideDays,
    optional,
    disableError,
  } = props;

  const mode = props.mode ?? "single";

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
      {({ onChange, fieldState, ...field }) => {
        if (mode === "single") {
          const { presets } = props as FormSingleDatePickerProps<V, N>;

          return (
            <DatePicker
              ref={field.ref}
              mode="single"
              value={field.value as Date | null | undefined}
              onValueChange={(date) => onChange(date ?? null)}
              placeholder={placeholder}
              disabled={disabled}
              fromDate={fromDate}
              toDate={toDate}
              startMonth={startMonth}
              endMonth={endMonth}
              layout={layout}
              showOutsideDays={showOutsideDays}
              presets={presets}
              aria-invalid={fieldState.invalid}
            />
          );
        }

        if (mode === "multiple") {
          const { min, max } = props as FormMultipleDatePickerProps<V, N>;
          return (
            <DatePicker
              ref={field.ref}
              mode="multiple"
              value={field.value as Date[] | null | undefined}
              onValueChange={(dates) => onChange(dates ?? null)}
              placeholder={placeholder}
              disabled={disabled}
              fromDate={fromDate}
              toDate={toDate}
              startMonth={startMonth}
              endMonth={endMonth}
              layout={layout}
              showOutsideDays={showOutsideDays}
              min={min}
              max={max}
              aria-invalid={fieldState.invalid}
            />
          );
        }

        if (mode === "range") {
          const { numberOfMonths, min, max } =
            props as FormRangeDatePickerProps<V, N>;
          return (
            <DatePicker
              ref={field.ref}
              mode="range"
              value={field.value as DateRange | null | undefined}
              onValueChange={(range) => onChange(range ?? null)}
              placeholder={placeholder}
              disabled={disabled}
              fromDate={fromDate}
              toDate={toDate}
              startMonth={startMonth}
              endMonth={endMonth}
              layout={layout}
              showOutsideDays={showOutsideDays}
              numberOfMonths={numberOfMonths}
              min={min}
              max={max}
              aria-invalid={fieldState.invalid}
            />
          );
        }

        return null!;
      }}
    </FormField>
  );
};
