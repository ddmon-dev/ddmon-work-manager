/**
 * 엑셀 컬럼 설정
 */
export type ExcelColumn<TData = any> = {
  /** 엑셀 헤더명 */
  header: string;
  /** 데이터 접근 키 (accessorKey 또는 accessorFn 중 택일) */
  accessorKey?: keyof TData;
  /** 데이터 접근 함수 (복잡한 변환 시 사용) */
  accessorFn?: (row: TData) => any;
  /** 셀 너비 (문자 단위, 기본: 15) */
  width?: number;
  /** 셀 포맷 (숫자, 날짜 등) */
  format?: string;
};

/**
 * 엑셀 스타일 설정
 */
export type ExcelStyle = {
  /** 헤더 배경색 (hex) */
  headerBgColor?: string;
  /** 헤더 텍스트 색상 (hex) */
  headerTextColor?: string;
  /** 헤더 폰트 굵기 */
  headerBold?: boolean;
  /** 데이터 테두리 */
  border?: boolean;
};

/**
 * 엑셀 생성 옵션
 */
export type ExcelOptions<TData = any> = {
  /** 데이터 배열 */
  data: TData[];
  /** 컬럼 설정 */
  columns: ExcelColumn<TData>[];
  /** 시트명 (기본: 'Sheet1') */
  sheetName?: string;
  /** 파일명 (기본: 'export.xlsx') */
  fileName?: string;
  /** 스타일 설정 */
  style?: ExcelStyle;
};
