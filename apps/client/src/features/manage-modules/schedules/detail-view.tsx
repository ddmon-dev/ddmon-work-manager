import { useMemo } from "react";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { DatePicker } from "@/shared/ui/date-picker";
import { TimePicker } from "@/shared/ui/time-picker";
import { Combobox } from "@/shared/ui/combobox";
import { SheetFooter, SheetBody, SheetContainer } from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/classnames";
import { ManageSheetClose, DeleteButton, useManageSheet } from "../_base/ui";
import { useClientList } from "../clients/api";
import { useProjectList } from "../projects/api";
import { useDeleteSchedule } from "./api";
import { ColorSelect } from "./color-select";
import { RecurrencePopover } from "./recurrence-popover";
import { useInlineSave } from "./use-inline-save";
import { InlineRow, INLINE_INPUT } from "./inline-row";
import type { ScheduleDTO } from "./types";

export function DetailView({ data }: { data: ScheduleDTO; refetch: () => void }) {
  const manageSheet = useManageSheet();
  const deleteSchedule = useDeleteSchedule();

  // 클라이언트/프로젝트 옵션
  const { data: clientData } = useClientList({ pageSize: 200 });
  const { data: projectData } = useProjectList({ pageSize: 200 });

  const clientOptions = useMemo(
    () =>
      clientData?.items.map((c) => ({ value: c.id, label: c.companyName })) ??
      [],
    [clientData]
  );
  const clientSelectOptions = useMemo(
    () => [{ value: "", label: "연결 안함" }, ...clientOptions],
    [clientOptions]
  );

  const projectOptions = useMemo(
    () =>
      projectData?.items.map((p) => ({
        value: p.id,
        label: p.name,
        clientId: p.clientId,
      })) ?? [],
    [projectData]
  );
  const projectSelectOptions = useMemo(
    () => [
      { value: "", label: "연결 안함" },
      ...projectOptions.map((p) => ({ value: p.value, label: p.label })),
    ],
    [projectOptions]
  );

  const { saveField, saveFields, savingField, getValue } = useInlineSave({
    data,
  });

  return (
    <>
      <SheetBody>
        <SheetContainer>
          {/* 분류 */}
          <InlineRow label="색상" saving={savingField === "color"} center>
            <div className="py-1">
              <ColorSelect
                value={getValue("color")}
                onChange={(v) => saveField("color", v)}
              />
            </div>
          </InlineRow>

          <InlineRow label="클라이언트" saving={savingField === "clientId"}>
            <Combobox
              value={getValue("clientId")}
              onValueChange={async (clientId) => {
                const currentProjectId = getValue("projectId");
                if (currentProjectId && clientId && projectOptions) {
                  const project = projectOptions.find(
                    (p) => p.value === currentProjectId
                  );
                  if (project?.clientId && project.clientId !== clientId) {
                    await saveField("projectId", "");
                  }
                }
                saveField("clientId", clientId);
              }}
              options={clientSelectOptions}
              placeholder="클라이언트 연결"
              searchPlaceholder="클라이언트 검색"
              className="!border-transparent bg-input/30 hover:bg-muted/50 h-8 shadow-none"
            />
          </InlineRow>

          <InlineRow label="프로젝트" saving={savingField === "projectId"}>
            {(() => {
              const selectedClientId = getValue("clientId");
              const filteredOptions = selectedClientId
                ? [
                    { value: "", label: "연결 안함" },
                    ...projectOptions
                      .filter((p) => p.clientId === selectedClientId)
                      .map((p) => ({ value: p.value, label: p.label })),
                  ]
                : projectSelectOptions;

              return (
                <Combobox
                  value={getValue("projectId")}
                  onValueChange={(projectId) => {
                    if (projectId && projectOptions) {
                      const project = projectOptions.find(
                        (p) => p.value === projectId
                      );
                      if (project?.clientId) {
                        saveField("clientId", project.clientId);
                      }
                    }
                    saveField("projectId", projectId);
                  }}
                  options={filteredOptions}
                  placeholder="프로젝트 연결"
                  searchPlaceholder="프로젝트 검색"
                  className="!border-transparent bg-input/30 hover:bg-muted/50 h-8 shadow-none"
                />
              );
            })()}
          </InlineRow>

          {/* 핵심 정보 */}
          <InlineRow label="제목" saving={savingField === "title"}>
            <Input
              defaultValue={getValue("title")}
              placeholder="제목 입력"
              className={cn(INLINE_INPUT, "h-8")}
              onBlur={(e) => saveField("title", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
          </InlineRow>

          <InlineRow label="설명" saving={savingField === "description"}>
            <Textarea
              defaultValue={getValue("description")}
              placeholder="설명 입력"
              className={cn(INLINE_INPUT, "resize-none min-h-[60px]")}
              onBlur={(e) => saveField("description", e.target.value)}
            />
          </InlineRow>

          {/* 기간 */}
          <InlineRow
            label="기간"
            saving={
              savingField === "startDate" || savingField === "endDate"
            }
          >
            <DatePicker
              mode="range"
              value={{
                from: new Date(getValue("startDate") + "T00:00:00"),
                to: getValue("endDate")
                  ? new Date(getValue("endDate")! + "T00:00:00")
                  : undefined,
              }}
              onValueChange={(range) => {
                if (!range) {
                  saveField("endDate", null);
                  return;
                }

                const currentStart = getValue("startDate");
                const newStart = range.from
                  ? formatDateStr(range.from)
                  : currentStart;
                const newEnd = range.to ? formatDateStr(range.to) : null;

                if (newStart !== currentStart) {
                  saveFields({ startDate: newStart, endDate: newEnd });
                } else {
                  saveField("endDate", newEnd);
                }
              }}
              numberOfMonths={2}
              className="h-8 text-sm !border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
            />
          </InlineRow>

          <InlineRow
            label="시간"
            saving={
              savingField === "startTime" || savingField === "endTime"
            }
          >
            <div className="flex items-center gap-2">
              <TimePicker
                value={getValue("startTime")}
                onValueChange={(v) => saveField("startTime", v)}
                placeholder="시작"
                className="h-8 border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <TimePicker
                value={getValue("endTime")}
                onValueChange={(v) => saveField("endTime", v)}
                placeholder="종료"
                className="h-8 border-transparent bg-input/30 hover:bg-muted/50 shadow-none"
              />
            </div>
          </InlineRow>

          <InlineRow
            label="반복"
            saving={
              savingField === "recurrenceType" ||
              savingField === "recurrenceEndDate"
            }
          >
            <RecurrencePopover
              recurrenceType={getValue("recurrenceType")}
              recurrenceEndDate={getValue("recurrenceEndDate")}
              onChangeType={(v) => saveField("recurrenceType", v)}
              onChangeEndDate={(v) => saveField("recurrenceEndDate", v)}
            />
          </InlineRow>

          {/* 장소 */}
          <InlineRow label="장소" saving={savingField === "location"}>
            <Input
              defaultValue={getValue("location")}
              placeholder="장소 입력"
              className={cn(INLINE_INPUT, "h-8")}
              onBlur={(e) => saveField("location", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
          </InlineRow>
        </SheetContainer>
      </SheetBody>

      <SheetFooter className="md:justify-between">
        <ManageSheetClose />
        <DeleteButton
          deleteFn={async () => {
            try {
              await deleteSchedule.mutateAsync(data.id);
              return { success: true as const, data: null };
            } catch (e) {
              return {
                success: false as const,
                error: e instanceof Error ? e.message : "삭제에 실패했습니다.",
              };
            }
          }}
          dataLabel={data.title}
          size="sm"
          variant="destructive-light"
          onSuccess={manageSheet.close}
        >
          삭제
        </DeleteButton>
      </SheetFooter>
    </>
  );
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
