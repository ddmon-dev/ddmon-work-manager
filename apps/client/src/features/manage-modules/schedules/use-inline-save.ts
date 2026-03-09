import { useState, useCallback, useRef } from "react";
import { useUpdateSchedule } from "./api";
import type { ScheduleDTO } from "./types";
import type { RecurrenceType } from "@packages/types";

type FieldName = keyof FormValues;

interface FormValues {
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  color: string;
  recurrenceType: RecurrenceType;
  recurrenceEndDate: Date | null;
}

function toFormValues(data: ScheduleDTO): FormValues {
  return {
    title: data.title,
    description: data.description ?? "",
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    color: data.color ?? "default",
    recurrenceType: (data.recurrenceType ?? "none") as RecurrenceType,
    recurrenceEndDate: data.recurrenceEndDate
      ? new Date(data.recurrenceEndDate + "T00:00:00")
      : null,
  };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toSubmitValues(values: FormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    startTime: values.startTime || undefined,
    endTime: values.endTime || undefined,
    color: values.color,
    recurrenceType: values.recurrenceType,
    recurrenceEndDate: values.recurrenceEndDate
      ? formatDate(values.recurrenceEndDate)
      : undefined,
  };
}

export function useInlineSave({ data }: { data: ScheduleDTO }) {
  const updateSchedule = useUpdateSchedule();
  const [savingField, setSavingField] = useState<FieldName | null>(null);
  const [optimistic, setOptimistic] = useState<Partial<FormValues>>({});
  const optimisticRef = useRef(optimistic);
  optimisticRef.current = optimistic;
  const dataRef = useRef(data);
  dataRef.current = data;

  const saveField = useCallback(
    async (fieldName: FieldName, rawValue: unknown) => {
      const baseValues = toFormValues(dataRef.current);
      const effectiveValues = { ...baseValues, ...optimisticRef.current };
      const effectiveFieldValue = effectiveValues[fieldName];

      // 현재 유효 값(optimistic 포함)과 비교
      if (
        effectiveFieldValue instanceof Date &&
        rawValue instanceof Date
      ) {
        if (effectiveFieldValue.getTime() === rawValue.getTime()) return;
      } else if (effectiveFieldValue === rawValue) {
        return;
      }

      // optimistic update
      setOptimistic((prev) => ({ ...prev, [fieldName]: rawValue }));

      const merged = { ...effectiveValues, [fieldName]: rawValue };
      const submitValues = toSubmitValues(merged as FormValues);

      setSavingField(fieldName);
      try {
        await updateSchedule.mutateAsync({
          id: dataRef.current.id,
          data: submitValues,
        });
      } catch {
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      } finally {
        setSavingField(null);
      }
    },
    [updateSchedule]
  );

  const getValue = useCallback(
    <K extends FieldName>(field: K): FormValues[K] => {
      if (field in optimistic) {
        return optimistic[field] as FormValues[K];
      }
      return toFormValues(dataRef.current)[field];
    },
    [optimistic]
  );

  const saveFields = useCallback(
    async (changes: Partial<FormValues>) => {
      setOptimistic((prev) => ({ ...prev, ...changes }));

      const baseValues = toFormValues(dataRef.current);
      const effectiveValues = { ...baseValues, ...optimisticRef.current };
      const merged = { ...effectiveValues, ...changes };
      const submitValues = toSubmitValues(merged as FormValues);

      setSavingField(Object.keys(changes)[0] as FieldName);
      try {
        await updateSchedule.mutateAsync({
          id: dataRef.current.id,
          data: submitValues,
        });
      } catch {
        setOptimistic((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(changes))
            delete next[key as FieldName];
          return next;
        });
      } finally {
        setSavingField(null);
      }
    },
    [updateSchedule]
  );

  return { saveField, saveFields, savingField, getValue };
}
