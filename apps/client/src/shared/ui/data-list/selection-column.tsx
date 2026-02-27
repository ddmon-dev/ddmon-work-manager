import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/shared/ui/checkbox";

/**
 * 테이블 행 선택을 위한 체크박스 컬럼 생성
 * - 헤더: 전체 선택/해제 (indeterminate 상태 지원)
 * - 셀: 개별 행 선택/해제
 */
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    size: 50,
    meta: {
      className: "text-center",
    },
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="전체 선택"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="행 선택"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}
