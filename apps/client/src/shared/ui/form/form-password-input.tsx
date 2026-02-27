import { ReactElement, useState } from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/ui/input-group";
import { FormField } from "./form-field";
import type { FormBaseProps, ExcludedFormProps } from "./types";

export type FormPasswordInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = FormBaseProps<V, N> &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    ExcludedFormProps | "type"
  > & {
    showToggle?: boolean;
  };

export const FormPasswordInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>({
  control,
  name,
  label,
  description,
  orientation,
  optional,
  showToggle = true,
  ...inputProps
}: FormPasswordInputProps<V, N>): ReactElement => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      orientation={orientation}
      optional={optional}
    >
      {({ fieldState, ...field }) =>
        showToggle ? (
          <InputGroup>
            <InputGroupInput
              {...field}
              {...inputProps}
              type={showPassword ? "text" : "password"}
              aria-invalid={fieldState.invalid}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <InputGroupInput
            {...field}
            {...inputProps}
            type="password"
            aria-invalid={fieldState.invalid}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
          />
        )
      }
    </FormField>
  );
};
