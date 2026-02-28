import * as XLSX from 'xlsx-js-style';
import type { ExcelOptions } from './types';

/**
 * 데이터를 엑셀 파일로 변환하여 다운로드
 */
export function exportToExcel<TData = any>(options: ExcelOptions<TData>): void {
  const { data, columns, sheetName = 'Sheet1', fileName = 'export.xlsx' } = options;

  // 1. 헤더 생성
  const headers = columns.map(col => col.header);

  // 2. 데이터 변환
  const rows = data.map(row =>
    columns.map(col => {
      if (col.accessorFn) {
        return col.accessorFn(row);
      }
      if (col.accessorKey) {
        return row[col.accessorKey];
      }
      return '';
    })
  );

  // 3. 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // 4. 컬럼 너비 설정
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // 5. 기본 스타일 적용
  applyDefaultStyles(ws, headers.length, rows.length);

  // 6. 워크북 생성 및 다운로드
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/**
 * 엑셀 시트에 기본 스타일 적용
 * - 헤더: 회색 배경 + 테두리
 * - 데이터: 테두리
 */
function applyDefaultStyles(ws: XLSX.WorkSheet, colCount: number, rowCount: number): void {
  const headerStyle = {
    fill: {
      fgColor: { rgb: 'D3D3D3' }, // 회색 배경
    },
    font: {
      bold: true,
    },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
    alignment: {
      vertical: 'center',
      horizontal: 'center',
    },
  };

  const dataStyle = {
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  // 헤더 스타일 적용 (첫 번째 행)
  for (let col = 0; col < colCount; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = headerStyle;
  }

  // 데이터 스타일 적용 (두 번째 행부터)
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = dataStyle;
    }
  }
}
