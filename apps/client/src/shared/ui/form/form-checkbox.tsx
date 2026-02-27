import type { FieldPath, FieldValues } from "react-hook-form";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

export interface FormCheckboxProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> extends Omit<FormBaseProps<V, N>, "orientation"> {
  disabled?: boolean;
}

export function FormCheckbox<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({ control, name, label, description, optional, disableError, disabled }: FormCheckboxProps<V, N>) {
  return (
    <FormField
      control={control}
      name={name}
      description={description}
      optional={optional}
      disableError={disableError}
    >
      {({ value, onChange, id }) => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          {label && (
            <Label htmlFor={id} className="cursor-pointer font-normal">
              {label}
            </Label>
          )}
        </div>
      )}
    </FormField>
  );
}
