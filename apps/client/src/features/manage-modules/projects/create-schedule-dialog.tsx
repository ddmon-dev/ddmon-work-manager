import { useEffect } from "react";
import { useForm, FormProvider, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import { scheduleWriteSchema, type ScheduleWriteInput } from "@packages/schemas";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { DatePicker } from "@/shared/ui/date-picker";
import { TimePicker } from "@/shared/ui/time-picker";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { ColorSelect } from "../schedules/color-select";
import { RecurrencePopover } from "../schedules/recurrence-popover";
import { InlineRow, INLINE_INPUT } from "../schedules/inline-row";
import { useCreateSchedule } from "../schedules/api";
import { cn } from "@/shared/utils/classnames";

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
  clientId: null,
  projectId: null,
  location: "",
  recurrenceType: "none",
  recurrenceEndDate: null,
};

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId: string;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  projectId,
  clientId,
}: CreateScheduleDialogProps) {
  const createSchedule = useCreateSchedule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: formDefaultValues,
  });

  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(formDefaultValues);
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    const submitData: ScheduleWriteInput = {
      ...values,
      projectId,
      clientId,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : null,
      recurrenceEndDate: values.recurrenceEndDate
        ? format(values.recurrenceEndDate, "yyyy-MM-dd")
        : null,
    };

    await createSchedule.mutateAsync(submitData);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>일정 추가</DialogTitle>
          <DialogDescription>프로젝트에 새 일정을 등록합니다.</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
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
                  const endDate = form.watch("endDate");
                  return (
                    <DatePicker
                      mode="range"
                      value={{
                        from: startField.value,
                        to: endDate ?? undefined,
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

            {/* 장소 */}
            <InlineRow label="장소" error={errors.location?.message}>
              <Input
                {...form.register("location")}
                placeholder="장소 입력"
                className={cn(INLINE_INPUT, "h-8")}
              />
            </InlineRow>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </DialogClose>
              <LoadingButton type="submit" isLoading={form.formState.isSubmitting}>
                추가
              </LoadingButton>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
