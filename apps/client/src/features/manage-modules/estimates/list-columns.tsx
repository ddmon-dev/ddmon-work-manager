import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/shared/utils/format";
import { StatusBadge } from "./status-badge";
import { EstimateRowActions } from "./row-actions";
import type { EstimateListItem } from "./types";

function getSupplyAmount(totalAmount: string, discountAmount: string, taxType: string): number {
  const total = Number(totalAmount) || 0;
  const discount = Number(discountAmount) || 0;
  const afterDiscount = total - discount;

  if (taxType === "exclusive") {
    return Math.round(afterDiscount / 1.1);
  }
  if (taxType === "inclusive") {
    return Math.round(afterDiscount / 1.1);
  }
  return afterDiscount;
}

export const listColumns: ColumnDef<EstimateListItem>[] = [
  {
    accessorKey: "estimateNumber",
    header: "견적번호",
    size: 120,
    meta: { className: "text-left" },
    cell: ({ row }) => (
      <div>
        <span>{row.original.estimateNumber}</span>
        <span className="ml-1.5 text-xs text-muted-foreground">v{row.original.version}</span>
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "제목",
    meta: { className: "text-left", truncate: true },
    cell: ({ row }) => (
      <div className="min-w-0 space-y-0.5">
        <span className="truncate block">{row.original.title}</span>
        {row.original.description && (
          <span className="truncate block text-xs text-muted-foreground">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "clientCompanyName",
    header: "고객명",
    size: 180,
    meta: { className: "text-left" },
  },
  {
    id: "supplyAmount",
    header: "공급가액",
    size: 160,
    meta: { className: "text-right" },
    cell: ({ row }) => {
      const supply = getSupplyAmount(
        row.original.totalAmount,
        row.original.discountAmount,
        row.original.taxType
      );
      return (
        <div className="text-right">
          <span>{formatCurrency(supply)}원</span>
        </div>
      );
    },
  },
  {
    accessorKey: "seriesStatus",
    header: "상태",
    size: 100,
    cell: ({ row }) => <StatusBadge status={row.original.seriesStatus} />,
  },
  {
    accessorKey: "issuedDate",
    header: "발행일",
    size: 120,
    cell: ({ row }) => row.original.issuedDate ?? "-",
  },
  {
    id: "actions",
    header: "",
    size: 50,
    meta: { className: "text-right" },
    cell: ({ row }) => (
      <EstimateRowActions
        id={row.original.id}
        estimateNumber={row.original.estimateNumber}
      />
    ),
  },
];
