import { type FieldPath, type FieldValues } from "react-hook-form";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "./form-field";
import type { FormBaseProps } from "./types";

type FormTextareaProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormBaseProps<V, N> & React.ComponentProps<typeof Textarea>;

export function FormTextarea<
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
  ...textareaProps
}: FormTextareaProps<V, N>) {
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
      {({ id, onChange, onBlur, value, ref, fieldState }) => (
        <Textarea
          id={id}
          ref={ref}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={fieldState.invalid}
          {...textareaProps}
        />
      )}
    </FormField>
  );
}
