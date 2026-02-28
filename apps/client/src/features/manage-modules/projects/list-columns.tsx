import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "./status-badge";
import { WorkPhaseIndicator } from "./work-phase-indicator";
import { AmountIndicator } from "./amount-indicator";
import { ProjectRowActions } from "./row-actions";
import type { ProjectDTO } from "./types";

export const listColumns: ColumnDef<ProjectDTO>[] = [
  {
    accessorKey: "projectNumber",
    header: "프로젝트번호",
    size: 140,
    meta: {
      className: "text-left",
    },
  },
  {
    accessorKey: "name",
    header: "프로젝트명",
    meta: {
      className: "text-left",
      truncate: true,
    },
    cell: ({ row }) => (
      <div className="min-w-0 space-y-0.5">
        <span className="truncate block">{row.original.name}</span>
        {row.original.description && (
          <span className="truncate block text-xs text-muted-foreground">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "client",
    header: "클라이언트",
    size: 150,
    meta: {
      className: "text-left",
      truncate: true,
    },
    cell: ({ row }) => row.original.client?.companyName ?? "-",
  },
  {
    accessorKey: "workPhase",
    header: "작업단계",
    size: 160,
    cell: ({ row }) => (
      <WorkPhaseIndicator
        projectId={row.original.id}
        workPhase={row.original.workPhase}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "상태",
    size: 90,
    cell: ({ row }) => (
      <StatusBadge
        projectId={row.original.id}
        status={row.original.status}
      />
    ),
  },
  {
    id: "amount",
    header: "금액",
    size: 220,
    cell: ({ row }) => (
      <AmountIndicator
        contractAmount={Number(row.original.contractAmount) || 0}
        taxType={row.original.taxType}
        paid={row.original.totalPaid ?? 0}
      />
    ),
  },
  {
    accessorKey: "contractDate",
    header: "계약일",
    size: 120,
    cell: ({ row }) => format(row.original.contractDate, "yyyy-MM-dd"),
  },
  {
    id: "actions",
    header: "",
    size: 50,
    meta: {
      className: "text-right",
    },
    cell: ({ row }) => <ProjectRowActions id={row.original.id} />,
  },
];
