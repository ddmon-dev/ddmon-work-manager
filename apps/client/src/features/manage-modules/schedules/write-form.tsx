import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scheduleWriteSchema, type ScheduleWriteInput } from "@work-manager/schemas";
import { FieldGroup } from "@/shared/ui/field";
import { FormTextInput, FormTextarea, FormSelect } from "@/shared/ui/form";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import {
  useManageSheet,
  ManageFormSubmit,
  ManageSheetClose,
  ManageSheetModeChange,
} from "../_base/ui";
import { useFormGuard } from "../_base/hooks";
import { useCreateSchedule, useUpdateSchedule } from "./api";
import { SCHEDULE_COLORS, RECURRENCE_LABELS } from "./config";
import type { ScheduleDTO } from "./types";

const COLOR_OPTIONS = SCHEDULE_COLORS.map((c) => ({ value: c.value, label: c.label }));
const RECURRENCE_OPTIONS = Object.entries(RECURRENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const formDefaultValues: ScheduleWriteInput = {
  title: "",
  description: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: null,
  startTime: "",
  endTime: "",
  color: "default",
  location: "",
  recurrenceType: "none",
  recurrenceEndDate: null,
};

interface WriteFormProps {
  id?: string;
  prevValues: ScheduleDTO | null;
}

export function WriteForm({ id, prevValues }: WriteFormProps) {
  const sheet = useManageSheet();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const createDate = sheet.data?.meta?.createDate as string | undefined;

  const form = useForm<ScheduleWriteInput>({
    resolver: zodResolver(scheduleWriteSchema) as Resolver<ScheduleWriteInput>,
    defaultValues: prevValues
      ? {
          title: prevValues.title,
          description: prevValues.description ?? "",
          startDate: prevValues.startDate,
          endDate: prevValues.endDate,
          startTime: prevValues.startTime ?? "",
          endTime: prevValues.endTime ?? "",
          color: prevValues.color,
          location: prevValues.location ?? "",
          recurrenceType: prevValues.recurrenceType,
          recurrenceEndDate: prevValues.recurrenceEndDate,
        }
      : {
          ...formDefaultValues,
          ...(createDate ? { startDate: createDate } : {}),
        },
  });

  useFormGuard(form);

  useEffect(() => {
    form.reset(
      prevValues
        ? {
            title: prevValues.title,
            description: prevValues.description ?? "",
            startDate: prevValues.startDate,
            endDate: prevValues.endDate,
            startTime: prevValues.startTime ?? "",
            endTime: prevValues.endTime ?? "",
            color: prevValues.color,
            location: prevValues.location ?? "",
            recurrenceType: prevValues.recurrenceType,
            recurrenceEndDate: prevValues.recurrenceEndDate,
          }
        : formDefaultValues
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevValues]);

  async function onSubmit(values: ScheduleWriteInput) {
    if (id) {
      await updateSchedule.mutateAsync({ id, data: values });
    } else {
      await createSchedule.mutateAsync(values);
    }
    sheet.close();
  }

  return (
    <SheetBody>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="divide-y">
          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="title"
                label="제목"
                placeholder="일정 제목을 입력해주세요."
              />
              <FormTextarea
                control={form.control}
                name="description"
                label="설명"
                placeholder="설명을 입력해주세요."
                optional
                rows={3}
              />
              <FormSelect
                control={form.control}
                name="color"
                label="색상"
                options={COLOR_OPTIONS}
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="startDate"
                label="시작일"
                type="date"
              />
              <FormTextInput
                control={form.control}
                name="endDate"
                label="종료일"
                type="date"
                optional
              />
              <FormTextInput
                control={form.control}
                name="startTime"
                label="시작 시간"
                type="time"
                optional
              />
              <FormTextInput
                control={form.control}
                name="endTime"
                label="종료 시간"
                type="time"
                optional
              />
            </FieldGroup>
          </SheetContainer>

          <SheetContainer>
            <FieldGroup>
              <FormTextInput
                control={form.control}
                name="location"
                label="장소"
                placeholder="장소를 입력해주세요."
                optional
              />
              <FormSelect
                control={form.control}
                name="recurrenceType"
                label="반복"
                options={RECURRENCE_OPTIONS}
              />
              <FormTextInput
                control={form.control}
                name="recurrenceEndDate"
                label="반복 종료일"
                type="date"
                optional
              />
            </FieldGroup>
          </SheetContainer>
        </div>

        <SheetFooter>
          <ManageSheetClose />
          {id && <ManageSheetModeChange mode="view" />}
          <ManageFormSubmit isLoading={form.formState.isSubmitting} />
        </SheetFooter>
      </form>
    </SheetBody>
  );
}
