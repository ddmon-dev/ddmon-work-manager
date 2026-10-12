import { PdfPreview } from '@/shared/ui/pdf-preview';
import { generateEstimateDocumentPdfBlob, toDocumentData } from './generate-document';
import { getDownloadFileName } from './get-download-file-name';
import type { EstimateWithDetails } from '../types';

interface Props {
  estimate: EstimateWithDetails;
}

export function EstimatePdfPreview({ estimate }: Props) {
  const data = toDocumentData(estimate);
  const dependencyKey = JSON.stringify(data);

  const generateBlob = () => generateEstimateDocumentPdfBlob(data);

  return (
    <PdfPreview
      generateBlob={generateBlob}
      downloadFileName={getDownloadFileName({
        bizName: estimate.publisherInfo?.bizName,
        title: estimate.title,
        issuedDate: estimate.issuedDate,
      })}
      dependencyKey={dependencyKey}
    />
  );
}
