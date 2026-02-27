import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useManageSheet } from "../ui/manage-sheet";

export function useFormGuard<T extends FieldValues>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<T, any, any>,
  enabled = true
) {
  const sheet = useManageSheet();

  // RHF Proxy 구독 활성화
  const isDirty = form.formState.isDirty;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!enabled) return;
    sheet.setCloseGuard(() => isDirtyRef.current);
    return () => {
      sheet.setCloseGuard(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);
}
