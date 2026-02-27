import { useCallback } from 'react';
import { PdfPreview } from '@/shared/ui/pdf-preview';
import { generateEstimatePdfBlob } from './estimate-document';
import type { EstimateWithDetails } from '../types';

interface Props {
  estimate: EstimateWithDetails;
}

export function EstimatePdfPreview({ estimate }: Props) {
  const dependencyKey = JSON.stringify(estimate);

  const generateBlob = useCallback(
    () => generateEstimatePdfBlob(estimate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependencyKey]
  );

  return (
    <PdfPreview
      generateBlob={generateBlob}
      downloadFileName={`견적서_${estimate.estimateNumber}${estimate.version > 1 ? `_v${estimate.version}` : ''}.pdf`}
      dependencyKey={dependencyKey}
    />
  );
}
