import { ReactElement } from "react";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { formatBizNumber } from "@/shared/utils/format";
import { FormTextInput } from "./form-text-input";
import type { FormTextInputProps } from "./form-text-input";

export type FormBizNumberInputProps<
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
> = Omit<FormTextInputProps<V, N>, "customFilter" | "valueTransform">;

/**
 * 사업자번호 입력 컴포넌트
 *
 * FormTextInput + bizNumberFilter 프리셋
 * - 123-45-67890 형식으로 자동 하이픈 삽입 (화면 표시)
 * - 폼에는 하이픈 제거된 숫자만 저장
 * - 숫자만 입력 허용
 * - 최대 10자리 제한
 */
export const FormBizNumberInput = <
  V extends FieldValues = FieldValues,
  N extends FieldPath<V> = FieldPath<V>,
>(
  props: FormBizNumberInputProps<V, N>
): ReactElement => {
  return (
    <FormTextInput
      {...props}
      customFilter={formatBizNumber}
      valueTransform={(value) => value.replace(/\D/g, "")}
      inputMode="numeric"
    />
  );
};
