import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import type { ClientEnvironmentDTO } from "./types";
import { ClientEnvironmentRowActions } from "./row-actions";

export const listColumns: ColumnDef<ClientEnvironmentDTO>[] = [
  {
    accessorKey: "name",
    header: "사이트/서비스명",
    size: 200,
    meta: {
      className: "text-left",
    },
  },
  {
    accessorKey: "clientName",
    header: "고객사",
    size: 150,
    meta: {
      className: "text-left",
    },
  },
  {
    id: "domainRegistrar",
    header: "도메인 업체",
    size: 200,
    meta: {
      className: "text-left",
      truncate: true,
    },
    cell: ({ row }) => {
      const domain = row.original.domain;
      return domain?.registrar ?? "";
    },
  },
  {
    accessorKey: "createdAt",
    header: "등록일",
    size: 120,
    meta: {
      className: "text-center",
    },
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), "yyyy-MM-dd");
    },
  },
  {
    id: "addons",
    header: "",
    size: 180,
    meta: {
      className: "text-right",
    },
    cell: ({ row }) => <ClientEnvironmentRowActions id={row.original.id} />,
  },
];
