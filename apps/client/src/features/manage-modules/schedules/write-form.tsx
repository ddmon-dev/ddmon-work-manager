import { useEffect } from "react";
import { useForm, useWatch, FormProvider, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseISO, format } from "date-fns";
import { z } from "zod";
import { scheduleWriteSchema, type ScheduleWriteInput } from "@packages/schemas";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { DatePicker } from "@/shared/ui/date-picker";
import { TimePicker } from "@/shared/ui/time-picker";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/classnames";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateSchedule, useUpdateSchedule } from "./api";
import { ColorSelect } from "./color-select";
import { RecurrencePopover } from "./recurrence-popover";
import { InlineRow, INLINE_INPUT } from "./inline-row";
import type { ScheduleDTO } from "./types";

// 로컬 폼 스키마: 날짜를 Date 객체로 override
const formSchema = scheduleWriteSchema.extend({
  startDate: z.date({ required_error: "시작일을 입력해주세요." }),
  endDate: z.date().nullable().optional(),
  recurrenceEndDate: z.date().nullable().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const formDefaultValues: FormValues = {
  title: "",
  description: "",
  startDate: new Date(),
  endDate: null,
  startTime: "",
  endTime: "",
  color: "default",
  recurrenceType: "none",
  recurrenceEndDate: null,
};

function toFormValues(data: ScheduleDTO): FormValues {
  return {
    title: data.title,
    description: data.description ?? "",
    startDate: parseISO(data.startDate),
    endDate: data.endDate ? parseISO(data.endDate) : null,
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    color: data.color,
    recurrenceType: data.recurrenceType,
    recurrenceEndDate: data.recurrenceEndDate
      ? parseISO(data.recurrenceEndDate)
      : null,
  };
}

interface WriteFormProps {
  id?: string;
  prevValues: ScheduleDTO | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const createDate = sheet.data?.meta?.createDate as string | undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: prevValues
      ? toFormValues(prevValues)
      : {
          ...formDefaultValues,
          ...(createDate ? { startDate: parseISO(createDate) } : {}),
        },
  });
  useFormGuard(form);

  useEffect(() => {
    form.reset(
      prevValues
        ? toFormValues(prevValues)
        : {
            ...formDefaultValues,
            ...(createDate ? { startDate: parseISO(createDate) } : {}),
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues, createDate]);

  const watchedEndDate = useWatch({ control: form.control, name: "endDate" });

  const { errors } = form.formState;

  async function onSubmit(values: FormValues) {
    const submitData: ScheduleWriteInput = {
      ...values,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : null,
      recurrenceEndDate: values.recurrenceEndDate
        ? format(values.recurrenceEndDate, "yyyy-MM-dd")
        : null,
    };

    if (id) {
      await updateSchedule.mutateAsync({ id, data: submitData });
    } else {
      await createSchedule.mutateAsync(submitData);
    }
    sheet.close();
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0"
      >
        <SheetBody>
          <SheetContainer>
            {/* 색상 */}
            <InlineRow label="색상" center>
              <div className="py-1">
                <Controller
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <ColorSelect value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            </InlineRow>

            {/* 제목 */}
            <InlineRow label="제목" error={errors.title?.message}>
              <Input
                {...form.register("title")}
                placeholder="제목 입력"
                className={cn(INLINE_INPUT, "h-8")}
              />
            </InlineRow>

            {/* 설명 */}
            <InlineRow label="설명" error={errors.description?.message}>
              <Textarea
                {...form.register("description")}
                placeholder="설명 입력"
                className={cn(INLINE_INPUT, "resize-none")}
              />
            </InlineRow>

            {/* 기간 */}
            <InlineRow
              label="기간"
              error={errors.startDate?.message ?? errors.endDate?.message}
            >
              <Controller
                control={form.control}
                name="startDate"
                render={({ field: startField }) => {
                  return (
                    <DatePicker
                      mode="range"
                      value={{
                        from: startField.value,
                        to: watchedEndDate ?? undefined,
                      }}
                      onValueChange={(range) => {
                        if (!range) {
                          form.setValue("endDate", null);
                          return;
                        }
                        if (range.from) {
                          startField.onChange(range.from);
                        }
                        form.setValue("endDate", range.to ?? null);
                      }}
                      numberOfMonths={2}
                      className="h-8 text-sm !border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
                    />
                  );
                }}
              />
            </InlineRow>

            {/* 시간 */}
            <InlineRow label="시간">
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <TimePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="시작"
                      className="h-8 border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
                    />
                  )}
                />
                <span className="text-muted-foreground text-sm">~</span>
                <Controller
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <TimePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="종료"
                      className="h-8 border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
                    />
                  )}
                />
              </div>
            </InlineRow>

            {/* 반복 */}
            <InlineRow label="반복" error={errors.recurrenceType?.message}>
              <Controller
                control={form.control}
                name="recurrenceType"
                render={({ field: typeField }) => (
                  <Controller
                    control={form.control}
                    name="recurrenceEndDate"
                    render={({ field: endDateField }) => (
                      <RecurrencePopover
                        recurrenceType={typeField.value}
                        recurrenceEndDate={endDateField.value ?? null}
                        onChangeType={typeField.onChange}
                        onChangeEndDate={endDateField.onChange}
                      />
                    )}
                  />
                )}
              />
            </InlineRow>

          </SheetContainer>
        </SheetBody>

        <SheetFooter>
          <ManageSheetClose />
          {id && <ManageSheetModeChange mode="view" />}
          <ManageFormSubmit isLoading={form.formState.isSubmitting} />
        </SheetFooter>
      </form>
    </FormProvider>
  );
}
