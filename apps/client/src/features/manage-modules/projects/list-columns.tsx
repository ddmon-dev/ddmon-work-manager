import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "./status-badge";
import { WorkPhaseIndicator } from "./work-phase-indicator";
import { ProjectRowActions } from "./row-actions";
import type { ProjectDTO } from "./types";

function formatAmount(amount: string | null): string {
  if (!amount) return "-";
  return Number(amount).toLocaleString("ko-KR") + "원";
}

export const listColumns: ColumnDef<ProjectDTO>[] = [
  {
    accessorKey: "projectNumber",
    header: "번호",
    size: 80,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.projectNumber}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "프로젝트명",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        {row.original.description && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
            {row.original.description}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "client",
    header: "클라이언트",
    cell: ({ row }) => row.original.client?.companyName ?? "-",
  },
  {
    accessorKey: "workPhase",
    header: "작업단계",
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
    size: 100,
    cell: ({ row }) => (
      <StatusBadge
        projectId={row.original.id}
        status={row.original.status}
      />
    ),
  },
  {
    accessorKey: "contractAmount",
    header: "계약금액",
    size: 130,
    cell: ({ row }) => formatAmount(row.original.contractAmount),
  },
  {
    accessorKey: "contractDate",
    header: "계약일",
    size: 110,
    cell: ({ row }) => row.original.contractDate,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ProjectRowActions id={row.original.id} />,
  },
];
