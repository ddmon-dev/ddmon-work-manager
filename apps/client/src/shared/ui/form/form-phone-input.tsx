import { ReactElement } from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { formatPhoneNumber } from "@/shared/utils/format";
import { FormTextInput } from "./form-text-input";
import type { FormTextInputProps } from "./form-text-input";

export type FormPhoneInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = Omit<FormTextInputProps<V, N>, "customFilter" | "valueTransform">;

/**
 * 전화번호 입력 컴포넌트
 *
 * FormTextInput + telFilter 프리셋
 * - 02/010/070 패턴에 따라 자동 하이픈 삽입 (화면 표시)
 * - 폼에는 하이픈 제거된 숫자만 저장
 * - 숫자만 입력 허용
 * - 최대 길이 자동 제한
 */
export const FormPhoneInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>(
  props: FormPhoneInputProps<V, N>
): ReactElement => {
  return (
    <FormTextInput
      {...props}
      customFilter={formatPhoneNumber}
      valueTransform={(value) => value.replace(/\D/g, "")}
      inputMode="tel"
    />
  );
};
