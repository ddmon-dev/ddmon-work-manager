import { ReactElement } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '../field';
import type { FormBaseProps } from './types';

export type FormCheckboxGroupProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = Omit<FormBaseProps<V, N>, 'orientation'> & {
  options: {
    label: string;
    value: string | number;
  }[];
  vertical?: boolean;
  /** 비활성화 */
  disabled?: boolean;
};

export const FormCheckboxGroup = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>({
  control,
  label,
  description,
  name,
  options,
  vertical = false,
  optional = false,
  disabled = false,
}: FormCheckboxGroupProps<V, N>): ReactElement => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid}>
          <FieldContent>
            <FieldLegend
              variant='label'
              className='flex mb-0'
            >
              {label}{' '}
              {optional && <span className='ml-auto text-muted-foreground text-xs'>(선택)</span>}
            </FieldLegend>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
          <FieldGroup
            data-slot='checkbox-group'
            className={
              vertical
                ? ''
                : 'flex-wrap flex-row [&>[data-slot=field]]:w-auto data-[slot=checkbox-group]:gap-x-6 data-[slot=checkbox-group]:gap-y-3'
            }
          >
            {options.map((option, index) => (
              <Field
                key={index}
                orientation='horizontal'
                data-invalid={fieldState.invalid}
                className='gap-0'
              >
                <Checkbox
                  ref={index === 0 ? field.ref : undefined}
                  id={`${field.name}-${index}`}
                  name={field.name}
                  disabled={disabled}
                  aria-invalid={fieldState.invalid}
                  checked={field.value.includes(option.value)}
                  onCheckedChange={checked => {
                    const newValue = checked
                      ? [...field.value, option.value]
                      : field.value.filter((value: string | number) => value !== option.value);
                    field.onChange(newValue);
                  }}
                />
                <FieldLabel
                  htmlFor={`${field.name}-${index}`}
                  className='pl-2 cursor-pointer pt-[0.05rem]'
                >
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </FieldSet>
      )}
    />
  );
};
