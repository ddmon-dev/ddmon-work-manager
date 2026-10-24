import { EstimateDocumentSkeleton } from "./estimate-document-skeleton";
import { PdfPreview } from "@/shared/ui/pdf-preview";
import { generateEstimateDocumentPdfBlob, toDocumentData } from "./generate-document";
import { getEstimateDocumentKey, type EstimateDocumentData } from "./document-data";
import { getDownloadFileName } from "./get-download-file-name";
import type { EstimateWithDetails } from "../types";

type Props = { scrollResetKey?: string } & ({ estimate: EstimateWithDetails; documentData?: never } | { estimate?: never; documentData: EstimateDocumentData | null });

export function EstimatePdfPreview(props: Props) {
  const data = props.estimate ? toDocumentData(props.estimate) : props.documentData;
  return (
    <PdfPreview
      enabled={!!data}
      scrollResetKey={props.scrollResetKey}
      generateBlob={() => data ? generateEstimateDocumentPdfBlob(data) : Promise.reject(new Error("견적서 데이터가 없습니다."))}
      downloadFileName={data ? getDownloadFileName(data) : undefined}
      dependencyKey={data ? getEstimateDocumentKey(data) : ""}
      skeleton={<EstimateDocumentSkeleton data={data ?? undefined} />}
    />
  );
}
