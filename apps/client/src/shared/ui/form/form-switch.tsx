import { ReactElement } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Switch } from '@/shared/ui/switch';
import { Field, FieldLabel, FieldError } from '../field';
import type { FormBaseProps } from './types';

export type FormSwitchProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = Omit<FormBaseProps<V, N>, 'description' | 'orientation'> & {
  disabled?: boolean;
};

export const FormSwitch = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>({
  control,
  name,
  label,
  disabled = false,
}: FormSwitchProps<V, N>): ReactElement => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Field
            orientation='horizontal'
            data-invalid={fieldState.invalid}
          >
            <Switch
              ref={field.ref}
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={fieldState.invalid}
              disabled={disabled}
            />
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          </Field>
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};
