import type { Control, FieldPath, FieldValues } from "react-hook-form";
import type { ReactNode } from "react";

export type ExcludedFormProps =
  | "name"
  | "value"
  | "onChange"
  | "onBlur"
  | "ref"
  | "id"
  | "defaultValue";

export type FormBaseProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = {
  control: Control<V>;
  name: N;
  label?: ReactNode;
  description?: ReactNode;
  orientation?: "vertical" | "horizontal" | "responsive";
  optional?: boolean;
  disableError?: boolean;
};
