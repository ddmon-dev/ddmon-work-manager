import { ReactElement } from "react";
import { Controller, type FieldPath, type FieldValues } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  FieldSet,
  FieldLegend,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../field";
import type { FormBaseProps } from "./types";

export type FormRadioGroupProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = Omit<FormBaseProps<V, N>, "orientation"> & {
  options: { label: string; value: string }[];
  vertical?: boolean;
  disabled?: boolean;
};

export const FormRadioGroup = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({
  control,
  label,
  description,
  name,
  options,
  vertical = false,
  optional = false,
  disabled = false,
}: FormRadioGroupProps<V, N>): ReactElement => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid}>
          <FieldContent>
            <FieldLegend variant="label" className="flex mb-0">
              {label}{" "}
              {optional && (
                <span className="ml-auto text-muted-foreground text-xs">(선택)</span>
              )}
            </FieldLegend>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            aria-invalid={fieldState.invalid}
            disabled={disabled}
            className={
              vertical
                ? ""
                : "flex flex-wrap flex-row gap-x-6 gap-y-3 [&>[data-slot=field]]:w-auto"
            }
          >
            {options.map((option, index) => (
              <Field
                key={index}
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="gap-0"
              >
                <RadioGroupItem
                  ref={index === 0 ? field.ref : undefined}
                  id={`${field.name}-${index}`}
                  value={option.value}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel
                  htmlFor={`${field.name}-${index}`}
                  className="pl-2 cursor-pointer pt-[0.05rem]"
                >
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </FieldSet>
      )}
    />
  );
};
