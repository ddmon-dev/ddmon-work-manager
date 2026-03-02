import { format } from "date-fns";
import { ExcelExportButton } from "@/shared/ui/excel-export-button";
import { type ExcelColumn } from "@/shared/lib/excel";
export { type ExcelColumn } from "@/shared/lib/excel/types";
import type { ActionResult } from "@packages/types";

type ExportDataButtonProps<T> = {
  fetchDataFn: () => Promise<ActionResult<T[]>>;
  columns: ExcelColumn<T>[];
  fileName?: string;
  sheetName?: string;
  children?: React.ReactNode | string;
};

export function ExportDataButton<T>({
  fetchDataFn,
  columns,
  fileName,
  sheetName = "Sheet1",
  children = "엑셀 다운로드",
}: ExportDataButtonProps<T>) {
  return (
    <ExcelExportButton
      fetchData={fetchDataFn}
      columns={columns}
      fileName={`${fileName ? fileName : "데이터내보내기"}_${format(
        new Date(),
        "yyyyMMddHHmmss"
      )}.xlsx`}
      sheetName={sheetName}
    >
      {children}
    </ExcelExportButton>
  );
}
