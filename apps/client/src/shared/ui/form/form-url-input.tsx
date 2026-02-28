import { ReactElement } from 'react';
import { type FieldPath, type FieldValues } from 'react-hook-form';
import { FormTextInput } from './form-text-input';
import type { FormTextInputProps } from './form-text-input';

export type FormUrlInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = Omit<FormTextInputProps<V, N>, 'inputMode'>;

/**
 * URL 입력 컴포넌트
 *
 * type="text" + inputMode="url" 프리셋
 * - 브라우저 자동 검증 비활성화 (Zod 스키마로 정확한 검증)
 * - 모바일 URL 키보드 (.com, /, : 버튼)
 *
 * @example
 * ```tsx
 * <FormUrlInput
 *   control={form.control}
 *   name="website"
 *   label="웹사이트"
 *   placeholder="https://example.com"
 * />
 * ```
 */
export const FormUrlInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>(
  props: FormUrlInputProps<V, N>
): ReactElement => {
  return (
    <FormTextInput
      {...props}
      inputMode='url'
    />
  );
};
