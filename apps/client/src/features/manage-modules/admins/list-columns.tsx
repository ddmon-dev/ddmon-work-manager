import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import { APP_CONFIG } from "@/app.config";
import type { AdminDTO } from "./types";
import { AdminRowActions } from "./row-actions";

export const listColumns: ColumnDef<AdminDTO>[] = [
  {
    accessorKey: "username",
    header: "아이디",
    meta: {
      className: "text-left",
    },
  },
  {
    accessorKey: "name",
    header: "이름",
    size: 150,
  },
  {
    accessorKey: "superAdmin",
    header: "구분",
    size: 150,
    cell: ({ row }) =>
      row.original.superAdmin
        ? APP_CONFIG.AUTH.ADMIN_LABELS.SUPER_ADMIN
        : APP_CONFIG.AUTH.ADMIN_LABELS.ADMIN,
  },
  {
    accessorKey: "createdAt",
    header: "생성일",
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
