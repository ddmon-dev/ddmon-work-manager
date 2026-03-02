import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingButton } from '@/shared/ui/loading-button';
import { exportToExcel, type ExcelColumn } from '@/shared/lib/excel';
import { delay } from '@/shared/utils/delays';
import type { ActionResult } from '@packages/types';

import { SUCCESS_MESSAGES } from '@/shared/constants/success-messages';
import { GENERAL_ERRORS } from '@/shared/constants/error-messages';

interface ExcelExportButtonProps<TData = any> {
  /** 서버에서 데이터를 가져오는 함수 (필수) */
  fetchData: () => Promise<ActionResult<TData[]>>;
  /** 엑셀 컬럼 설정 */
  columns: ExcelColumn<TData>[];
  /** 파일명 (기본: 'export.xlsx') */
  fileName?: string;
  /** 시트명 (기본: 'Sheet1') */
  sheetName?: string;
  /** 버튼 텍스트 */
  children?: React.ReactNode;
  /** 버튼 variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  /** 버튼 크기 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 추가 className */
  className?: string;
}

export function ExcelExportButton<TData = any>({
  fetchData,
  columns,
  fileName,
  sheetName = 'Sheet1',
  children = '엑셀 다운로드',
  variant = 'outline',
  size = 'default',
  className,
}: ExcelExportButtonProps<TData>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const { success, data, error } = await fetchData();

      if (!success) {
        toast.error(error);
        return;
      }

      await delay(200);

      exportToExcel({
        data,
        columns,
        fileName,
        sheetName,
      });

      toast.success(SUCCESS_MESSAGES.DOWNLOAD_SUCCESS());
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      toast.error(GENERAL_ERRORS.UNEXPECTED);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoadingButton
      icon={<ExcelIcon className='text-success' />}
      variant={variant}
      size={size}
      onClick={handleExport}
      isLoading={isLoading}
      className={className}
    >
      {children}
    </LoadingButton>
  );
}

function ExcelIcon({ className }: { className?: string }) {
  return (
    <svg
      stroke='currentColor'
      fill='currentColor'
      strokeWidth='0'
      viewBox='0 0 24 24'
      height='1em'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <path d='M2.85858 2.87732L15.4293 1.0815C15.7027 1.04245 15.9559 1.2324 15.995 1.50577C15.9983 1.52919 16 1.55282 16 1.57648V22.4235C16 22.6996 15.7761 22.9235 15.5 22.9235C15.4763 22.9235 15.4527 22.9218 15.4293 22.9184L2.85858 21.1226C2.36593 21.0522 2 20.6303 2 20.1327V3.86727C2 3.36962 2.36593 2.9477 2.85858 2.87732ZM17 2.99997H21C21.5523 2.99997 22 3.44769 22 3.99997V20C22 20.5523 21.5523 21 21 21H17V2.99997ZM10.2 12L13 7.99997H10.6L9 10.2857L7.39999 7.99997H5L7.8 12L5 16H7.39999L9 13.7143L10.6 16H13L10.2 12Z'></path>
    </svg>
  );
}
