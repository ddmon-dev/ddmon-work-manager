import { ReactElement } from 'react';
import { type FieldPath, type FieldValues } from 'react-hook-form';
import { MultiCombobox } from '@/shared/ui/multi-combobox';
import { FormField } from './form-field';
import type { FormBaseProps } from './types';

export type FormMultiComboboxProps<
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

export const FormMultiCombobox = <
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
}: FormMultiComboboxProps<V, N>): ReactElement => {
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
        <MultiCombobox
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
