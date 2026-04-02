import { PdfPreview } from '@/shared/ui/pdf-preview';
import { generateEstimatePdfBlob } from './estimate-document';
import { getDownloadFileName } from './get-download-file-name';
import type { EstimateWithDetails } from '../types';

interface Props {
  estimate: EstimateWithDetails;
}

export function EstimatePdfPreview({ estimate }: Props) {
  const dependencyKey = JSON.stringify(estimate);

  const generateBlob = () => generateEstimatePdfBlob(estimate);

  return (
    <PdfPreview
      generateBlob={generateBlob}
      downloadFileName={getDownloadFileName({
        bizName: estimate.publisherInfo?.bizName,
        title: estimate.title,
        issuedDate: estimate.issuedDate,
        version: estimate.version,
      })}
      dependencyKey={dependencyKey}
    />
  );
}
