import * as React from "react";

import { cn } from "@/shared/utils/classnames";

type InputProps = React.ComponentProps<'input'> & {
  /**
   * onBlur 시 자동 trim 기능 비활성화
   * - 기본값: false (trim 활성화)
   * - true로 설정 시 공백 유지
   */
  disableTrim?: boolean;
};

function Input({
  className,
  type = 'text',
  disableTrim,
  onBlur,
  ...props
}: InputProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // trim 비활성화가 아니고, text 계열 input인 경우만 trim 적용
    if (
      !disableTrim &&
      (type === 'text' ||
        type === 'email' ||
        type === 'url' ||
        type === 'tel' ||
        type === 'search')
    ) {
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        e.target.value = trimmedValue;
        // Input 이벤트 디스패치하여 react-hook-form에 변경 알림
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // 기존 onBlur 핸들러 호출
    onBlur?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 md:h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      onBlur={handleBlur}
      {...props}
    />
  );
}

export { Input };
