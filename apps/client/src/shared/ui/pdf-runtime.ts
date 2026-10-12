let runtime: Promise<{ pdfjs: typeof import('pdfjs-dist'); worker: import('pdfjs-dist').PDFWorker }> | undefined;

/** 미리보기 사이에서 PDF.js 모듈과 워커를 공유한다. */
export function getPdfRuntime() {
  if (runtime) return runtime;
  runtime = (async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
    ).toString();
    const worker = new pdfjs.PDFWorker();
    try {
      await worker.promise;
      return { pdfjs, worker };
    } catch (error) {
      worker.destroy();
      throw error;
    }
  })().catch((error: unknown) => {
    runtime = undefined;
    throw error;
  });
  return runtime;
}
