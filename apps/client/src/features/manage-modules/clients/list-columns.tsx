import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import { formatPhoneNumber } from "@/shared/utils/format";
import type { ClientDTO } from "./types";
import { ClientRowActions } from "./row-actions";

export const listColumns: ColumnDef<ClientDTO>[] = [
  {
    accessorKey: "companyName",
    header: "회사명",
    meta: {
      className: "text-left",
      truncate: true,
    },
  },
  {
    accessorKey: "contactName",
    header: "담당자",
    size: 120,
    meta: {
      className: "text-left",
    },
  },
  {
    accessorKey: "phone",
    header: "연락처",
    size: 140,
    meta: {
      className: "text-left",
    },
    cell: ({ row }) => {
      const phone = row.original.phone;
      return phone ? formatPhoneNumber(phone) : "";
    },
  },
  {
    accessorKey: "email",
    header: "이메일",
    size: 200,
    meta: {
      className: "text-left",
      truncate: true,
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
    cell: ({ row }) => <ClientRowActions id={row.original.id} />,
  },
];
