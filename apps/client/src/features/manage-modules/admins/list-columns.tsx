import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/ui/badge";
import type { AdminDTO } from "./types";
import { AdminRowActions } from "./row-actions";

export const listColumns: ColumnDef<AdminDTO>[] = [
  {
    accessorKey: "username",
    header: "사용자명",
    size: 140,
  },
  {
    accessorKey: "name",
    header: "이름",
    size: 140,
  },
  {
    accessorKey: "superAdmin",
    header: "권한",
    size: 100,
    cell: ({ row }) =>
      row.original.superAdmin ? (
        <Badge variant="default">최고 관리자</Badge>
      ) : (
        <Badge variant="secondary">일반</Badge>
      ),
  },
  {
    accessorKey: "createdAt",
    header: "등록일",
    size: 120,
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "yyyy-MM-dd"),
  },
  {
    id: "addons",
    header: "",
    size: 180,
    meta: {
      className: "text-right",
    },
    cell: ({ row }) => (
      <AdminRowActions
        id={row.original.id}
        superAdmin={row.original.superAdmin}
      />
    ),
  },
];
