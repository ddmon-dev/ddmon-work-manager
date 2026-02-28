import { ReactElement } from 'react';
import { type FieldPath, type FieldValues } from 'react-hook-form';
import { Editor } from '@/shared/ui/editor/editor';
import { FormField } from './form-field';
import type { FormBaseProps } from './types';

export type FormEditorProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = FormBaseProps<V, N> & {
  placeholder?: string;
  className?: string;
  /** 업로드 폴더 경로 (우선순위 1: 명시적 경로) */
  uploadFolder?: string;
  /** 엔티티명 (우선순위 2: 자동 경로 생성용, 예: 'notices') */
  entity?: string;
  /** 최대 이미지 크기 (MB 단위, 기본값: 2) */
  maxImageSizeMB?: number;
  /** 허용되는 이미지 형식 (기본값: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) */
  acceptedImageFormats?: string[];
  /** 비활성화 */
  disabled?: boolean;
};

export const FormEditor = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>({
  control,
  name,
  label,
  description,
  orientation,
  optional,
  placeholder = '내용을 입력하세요...',
  className,
  uploadFolder,
  entity,
  maxImageSizeMB,
  acceptedImageFormats,
  disabled = false,
}: FormEditorProps<V, N>): ReactElement => {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      orientation={orientation}
      optional={optional}
    >
      {({ onChange, ...field }) => (
        <Editor
          ref={field.ref}
          content={field.value as string}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          uploadFolder={uploadFolder}
          entity={entity}
          maxImageSizeMB={maxImageSizeMB}
          acceptedImageFormats={acceptedImageFormats}
          disabled={disabled}
        />
      )}
    </FormField>
  );
};
