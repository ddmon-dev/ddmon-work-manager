import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/ui/badge";
import { formatPhoneNumber } from "@/shared/utils/format";
import type { PartnerDTO } from "./types";
import { PartnerRowActions } from "./row-actions";

export const listColumns: ColumnDef<PartnerDTO>[] = [
  {
    accessorKey: "name",
    header: "이름",
    size: 120,
    meta: {
      className: "text-left",
    },
  },
  {
    accessorKey: "specialties",
    header: "전문분야",
    meta: {
      className: "text-left",
    },
    cell: ({ row }) => {
      const specialties = row.original.specialties;
      if (!specialties || specialties.length === 0) return "";
      return (
        <div className="flex flex-wrap gap-1">
          {specialties.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
      );
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
    cell: ({ row }) => <PartnerRowActions id={row.original.id} />,
  },
];
