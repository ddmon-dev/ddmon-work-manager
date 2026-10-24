import { getEstimateDocumentKey, type EstimateDocumentData } from './document-data';

export { toDocumentData, type EstimateDocumentData } from './document-data';

// 재표시·다운로드에 동일한 PDF를 재사용하고, 폼 입력 이력은 최근 12개로 제한한다.
const documents = new Map<string, Promise<Blob>>();

export function generateEstimateDocumentPdfBlob(data: EstimateDocumentData): Promise<Blob> {
  const key = getEstimateDocumentKey(data);
  const cached = documents.get(key);
  if (cached) {
    documents.delete(key);
    documents.set(key, cached);
    return cached;
  }

  const pending = import('./estimate-document')
    .then(({ renderEstimatePdf }) => renderEstimatePdf(data))
    .catch((error: unknown) => {
      if (documents.get(key) === pending) documents.delete(key);
      throw error;
    });
  documents.set(key, pending);
  if (documents.size > 12) documents.delete(documents.keys().next().value!);
  return pending;
}
