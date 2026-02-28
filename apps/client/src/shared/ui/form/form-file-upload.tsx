import { ReactElement, useState } from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import {
  type FormFileValue,
  type FileAcceptPreset,
  fileAcceptPresets,
  MultiFileUpload,
} from '@/shared/ui/file-upload';
import { mbToBytes, formatFileSize } from '@/shared/utils/format';
import { FieldSet, FieldLegend, FieldContent, FieldDescription, FieldError } from '../field';
import type { FormBaseProps } from './types';

// TODO: @/shared/ui/file-upload 컴포넌트가 아직 이전되지 않음
// file-upload 컴포넌트 이전 후 이 파일이 정상 동작함

export type FormFileUploadProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = Omit<FormBaseProps<V, N>, 'orientation'> & {
  max?: number;
  accept?: string;
  acceptPreset?: FileAcceptPreset;
  /** 최대 파일 크기 (MB 단위) */
  maxSize?: number;
  placeholder?: string;
  hideConstraints?: boolean;
  /** 비활성화 */
  disabled?: boolean;
};

const generateFileConstraintsText = (
  accept?: string,
  maxSize?: number,
  max?: number
): string | null => {
  const parts: string[] = [];

  if (accept) {
    const extensions = accept
      .split(',')
      .map(t => t.trim())
      .map(t => {
        if (t.startsWith('.')) {
          return t.slice(1);
        } else if (t.endsWith('/*')) {
          const baseType = t.slice(0, -2);
          if (baseType === 'image') return '이미지';
          if (baseType === 'video') return '비디오';
          if (baseType === 'audio') return '오디오';
          return baseType;
        }
        return t;
      });

    // 확장자가 5개 초과시 앞 4개 + "등"으로 표기
    if (extensions.length > 5) {
      parts.push(extensions.slice(0, 4).join(', ') + ' 등');
    } else {
      parts.push(extensions.join(', '));
    }
  }

  if (maxSize) {
    parts.push(`최대 ${formatFileSize(maxSize)}`);
  }

  if (max) {
    parts.push(`최대 ${max}개`);
  }

  return parts.length > 0 ? parts.join(' / ') : null;
};

export const FormFileUpload = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>({
  control,
  name,
  label,
  description,
  optional = false,
  max = 1,
  accept,
  acceptPreset,
  maxSize,
  placeholder,
  hideConstraints = false,
  disabled = false,
}: FormFileUploadProps<V, N>): ReactElement => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolvedAccept = acceptPreset ? fileAcceptPresets[acceptPreset] : accept;
  const resolvedMaxSizeBytes = maxSize ? mbToBytes(maxSize) : undefined;
  const constraintsText = !hideConstraints
    ? generateFileConstraintsText(resolvedAccept, resolvedMaxSizeBytes, max)
    : null;
  const displayDescription = description || constraintsText;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet
          data-invalid={fieldState.invalid || !!validationError}
          className='gap-2'
        >
          <FieldContent>
            {label && (
              <FieldLegend
                variant='label'
                className='flex mb-0'
              >
                {label}{' '}
                {optional && <span className='ml-auto text-muted-foreground text-xs'>(선택)</span>}
              </FieldLegend>
            )}
            {displayDescription && <FieldDescription>{displayDescription}</FieldDescription>}
          </FieldContent>
          <MultiFileUpload
            ref={field.ref}
            value={field.value as FormFileValue[]}
            onValueChange={field.onChange}
            onError={setValidationError}
            accept={accept}
            acceptPreset={acceptPreset}
            maxSize={maxSize}
            max={max}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid || !!validationError}
          />
          {(fieldState.error || validationError) && (
            <FieldError>{validationError || fieldState.error?.message}</FieldError>
          )}
        </FieldSet>
      )}
    />
  );
};
