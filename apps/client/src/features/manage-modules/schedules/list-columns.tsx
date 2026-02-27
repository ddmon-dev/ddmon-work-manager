import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/shared/utils/classnames";
import { getColorClassName, RECURRENCE_LABELS } from "./config";
import { ScheduleRowActions } from "./row-actions";
import type { ScheduleDTO } from "./types";

export const listColumns: ColumnDef<ScheduleDTO>[] = [
  {
    accessorKey: "title",
    header: "제목",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            getColorClassName(row.original.color)
          )}
        />
        <span className="font-medium">{row.original.title}</span>
      </div>
    ),
  },
  {
    accessorKey: "startDate",
    header: "시작일",
    cell: ({ row }) => row.original.startDate,
  },
  {
    accessorKey: "endDate",
    header: "종료일",
    cell: ({ row }) => row.original.endDate ?? "-",
  },
  {
    accessorKey: "startTime",
    header: "시간",
    cell: ({ row }) => {
      const { startTime, endTime } = row.original;
      if (!startTime) return "종일";
      return endTime ? `${startTime} ~ ${endTime}` : startTime;
    },
  },
  {
    accessorKey: "recurrenceType",
    header: "반복",
    cell: ({ row }) =>
      RECURRENCE_LABELS[row.original.recurrenceType] ?? row.original.recurrenceType,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ScheduleRowActions id={row.original.id} />,
  },
];
