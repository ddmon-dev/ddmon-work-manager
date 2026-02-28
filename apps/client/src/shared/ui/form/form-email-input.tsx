import { ReactElement } from 'react';
import { type FieldPath, type FieldValues } from 'react-hook-form';
import { FormTextInput } from './form-text-input';
import type { FormTextInputProps } from './form-text-input';

export type FormEmailInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
> = Omit<FormTextInputProps<V, N>, 'inputMode'>;

/**
 * 이메일 입력 컴포넌트
 *
 * type="text" + inputMode="email" 프리셋
 * - 브라우저 자동 검증 비활성화 (Zod 스키마로 정확한 검증)
 * - 모바일 이메일 키보드 (@, .com 버튼)
 *
 * @example
 * ```tsx
 * <FormEmailInput
 *   control={form.control}
 *   name="email"
 *   label="이메일"
 *   placeholder="example@example.com"
 * />
 * ```
 */
export const FormEmailInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>
>(
  props: FormEmailInputProps<V, N>
): ReactElement => {
  return (
    <FormTextInput
      {...props}
      inputMode='email'
    />
  );
};
