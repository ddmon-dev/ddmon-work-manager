import { ReactElement } from 'react';
import { type FieldPath, type FieldValues } from 'react-hook-form';
import { Combobox } from '@/shared/ui/combobox';
import { FormField } from './form-field';
import type { FormBaseProps } from './types';

export type FormComboboxProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = FormBaseProps<V, N> & {
  options: {
    label: string;
    value: string;
  }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
};

export const FormCombobox = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>({
  control,
  name,
  label,
  description,
  orientation,
  optional,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
  disabled = false,
}: FormComboboxProps<V, N>): ReactElement => {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      orientation={orientation}
      optional={optional}
    >
      {({ onChange, fieldState, ...field }) => (
        <Combobox
          ref={field.ref}
          value={field.value}
          onValueChange={onChange}
          options={options}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          className={className}
          aria-invalid={fieldState.invalid}
          disabled={disabled}
        />
      )}
    </FormField>
  );
};
