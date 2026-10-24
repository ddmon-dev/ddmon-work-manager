export type PdfFitMode = "fit-page" | "fit-width";

export const A4_PAGE = { width: 595.28, height: 841.89 };
export const PDF_PREVIEW_PADDING = 16;

/** 스켈레톤과 canvas가 같은 문서 크기를 사용한다. */
export function getPdfPageSize(
  width: number,
  height: number,
  fitMode: PdfFitMode,
  page = A4_PAGE,
) {
  const scale = fitMode === "fit-width"
    ? Math.max(0, width) / page.width
    : Math.min(Math.max(0, width) / page.width, Math.max(0, height) / page.height);
  return { width: page.width * scale, height: page.height * scale };
}
