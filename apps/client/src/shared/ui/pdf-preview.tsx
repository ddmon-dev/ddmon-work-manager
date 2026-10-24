import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Maximize, ArrowLeftRight, Download, Loader2 } from "lucide-react";
import { getPdfRuntime } from "./pdf-runtime";
import { PDF_PREVIEW_PADDING, getPdfPageSize, type PdfFitMode } from "./pdf-preview-layout";
import { toast } from "sonner";
import { createPdfPreviewQueue } from "@/shared/lib/pdf-preview-queue";
import { cn } from "@/shared/utils/classnames";
import { downloadBlob } from "@/shared/utils/download";

const previewClassName = "relative flex-1 overflow-y-auto hide-scrollbar bg-background-secondary dark:bg-secondary/50 p-4";

function usePreviewSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const width = container.clientHeight > 0 ? Math.max(0, container.clientWidth - PDF_PREVIEW_PADDING * 2) : 0;
      const height = Math.max(0, container.clientHeight - PDF_PREVIEW_PADDING * 2);
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function PdfPreviewSkeleton({ width, height, children }: { width: number; height: number; children?: ReactNode }) {
  return (
    <div role="status" aria-label="견적서 미리보기를 준비하고 있습니다" className="flex min-h-full flex-col items-center">
      <div data-slot="pdf-preview-page" aria-hidden="true" className="shrink-0 overflow-hidden rounded bg-white shadow-lg" style={{ width, height }}>
        {children}
      </div>
    </div>
  );
}

function IslandButton({
  active,
  children,
  ...props
}: {
  active?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "size-8 inline-flex items-center justify-center rounded-full transition-colors",
        "disabled:opacity-40",
        active
          ? "bg-white/90 text-black dark:bg-black/80 dark:text-white"
          : "text-white/60 hover:text-white hover:bg-white/10 dark:text-black/50 dark:hover:text-black dark:hover:bg-black/10"
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type PreviewRequest = { key: string; width: number; retry: number; generate: () => Promise<Blob> };
type PreviewFrame = { fragment: DocumentFragment; blob: Blob };

interface PdfPreviewProps {
  enabled?: boolean;
  /** PDF Blob을 생성하는 함수 */
  generateBlob: () => Promise<Blob>;
  /** 다운로드 시 파일명 */
  downloadFileName?: string;
  /** 재렌더링 트리거용 의존성 키 (예: JSON.stringify(data)) */
  dependencyKey: string;
  skeleton?: ReactNode;
}

/**
 * PDF를 canvas에 렌더링하는 미리보기 컴포넌트.
 * 전체 페이지를 렌더링하여 스크롤 가능하게 표시.
 * 분리된 canvas에 먼저 그린 뒤 전체 페이지를 교체한다.
 */
export function PdfPreview({
  enabled = true,
  generateBlob,
  downloadFileName,
  dependencyKey,
  skeleton,
}: PdfPreviewProps) {
  const [fitMode, setFitMode] = useState<PdfFitMode>("fit-width");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generateRef = useRef(generateBlob);
  const fitModeRef = useRef(fitMode);
  const viewport = usePreviewSize(scrollRef);
  const renderWidth = viewport.width;
  const skeletonPage = getPdfPageSize(viewport.width, viewport.height, fitMode);
  const blobRef = useRef<{ key: string; blob: Blob } | null>(null);
  const displayedRef = useRef<{ key: string; width: number; retry: number } | null>(null);
  const errorToastRef = useRef<string | number | undefined>(undefined);
  const [queue] = useState(() => createPdfPreviewQueue<PreviewRequest, PreviewFrame>({
    async render(request, signal) {
      if (!displayedRef.current) {
        setStatus("loading");
        setError("");
      }
      let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
      let rendering: import("pdfjs-dist").RenderTask | undefined;
      const timeout = AbortSignal.timeout(30_000);
      const workSignal = AbortSignal.any([signal, timeout]);
      const cancel = () => {
        rendering?.cancel();
        void task?.destroy();
      };
      workSignal.addEventListener("abort", cancel, { once: true });
      try {
        // PDF 생성은 중단할 수 없으므로 완료를 기다린 뒤 최신 입력을 처리한다.
        const [blobResult, runtimeResult] = await Promise.allSettled([request.generate(), getPdfRuntime()]);
        workSignal.throwIfAborted();
        if (blobResult.status === "rejected") throw blobResult.reason;
        if (runtimeResult.status === "rejected") throw runtimeResult.reason;
        const blob = blobResult.value;
        const { pdfjs, worker } = runtimeResult.value;
        const data = await blob.arrayBuffer();
        workSignal.throwIfAborted();
        task = pdfjs.getDocument({ data, worker });
        const pdf = await task.promise;
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          workSignal.throwIfAborted();
          const pageViewport = page.getViewport({ scale: 1 });
          const scaled = page.getViewport({ scale: request.width / pageViewport.width * Math.min(window.devicePixelRatio, 2) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(scaled.width);
          canvas.height = Math.ceil(scaled.height);
          canvas.dataset.pageWidth = String(pageViewport.width);
          canvas.dataset.pageHeight = String(pageViewport.height);
          canvas.className = "shadow-lg rounded shrink-0";
          rendering = page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: scaled });
          await rendering.promise;
          workSignal.throwIfAborted();
          fragment.appendChild(canvas);
        }
        return { fragment, blob };
      } catch (cause) {
        if (timeout.aborted && !signal.aborted) throw new Error("미리보기 생성 시간이 초과되었습니다. 다시 시도해 주세요.");
        throw cause;
      } finally {
        workSignal.removeEventListener("abort", cancel);
        await task?.destroy();
      }
    },
    commit({ fragment, blob }, request) {
      const container = scrollRef.current;
      const pages = pagesRef.current;
      if (!container || !pages) return;
      const scrollTop = container.scrollTop;
      fragment.querySelectorAll("canvas").forEach(canvas => {
        const size = getPdfPageSize(container.clientWidth - PDF_PREVIEW_PADDING * 2, container.clientHeight - PDF_PREVIEW_PADDING * 2, fitModeRef.current, {
          width: Number(canvas.dataset.pageWidth), height: Number(canvas.dataset.pageHeight),
        });
        canvas.style.width = `${size.width}px`;
        canvas.style.height = `${size.height}px`;
      });
      // 완성된 문서만 한 번에 교체한다. 이전 canvas는 이 시점까지 그대로 보인다.
      pages.replaceChildren(fragment);
      container.scrollTop = scrollTop;
      blobRef.current = { key: request.key, blob };
      displayedRef.current = { key: request.key, width: request.width, retry: request.retry };
      if (errorToastRef.current !== undefined) toast.dismiss(errorToastRef.current);
      setError("");
      setStatus("ready");
    },
    onError(cause) {
      const message = cause instanceof Error ? cause.message : "PDF 미리보기를 불러오지 못했습니다.";
      if (displayedRef.current) {
        errorToastRef.current = toast.error("미리보기를 갱신하지 못했습니다. 이전 문서를 유지합니다.", {
          id: errorToastRef.current,
          description: message,
          action: { label: "다시 시도", onClick: () => setRetry(value => value + 1) },
        });
      } else {
        setError(message);
        setStatus("error");
      }
    },
  }));

  useEffect(() => {
    generateRef.current = generateBlob;
    fitModeRef.current = fitMode;
  }, [generateBlob, fitMode]);

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const cached = blobRef.current;
      const blob = cached?.key === dependencyKey ? cached.blob : await generateBlob();
      downloadBlob(blob, downloadFileName ?? "document.pdf");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!enabled || renderWidth <= 0) {
      queue.clear();
      return;
    }
    const displayed = displayedRef.current;
    if (displayed?.key === dependencyKey && displayed.width === renderWidth && displayed.retry === retry) {
      queue.clear();
      return;
    }
    queue.update({ key: dependencyKey, width: renderWidth, retry, generate: generateRef.current });
  }, [dependencyKey, enabled, retry, renderWidth, queue]);

  useEffect(() => () => {
    queue.clear();
    if (errorToastRef.current !== undefined) toast.dismiss(errorToastRef.current);
  }, [queue]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    function fitPages() {
      if (!container) return;
      const width = Math.max(1, container.clientWidth - PDF_PREVIEW_PADDING * 2);
      const height = Math.max(1, container.clientHeight - PDF_PREVIEW_PADDING * 2);
      pagesRef.current?.querySelectorAll("canvas").forEach((canvas) => {
        const pageWidth = Number(canvas.dataset.pageWidth);
        const pageHeight = Number(canvas.dataset.pageHeight);
        const page = getPdfPageSize(width, height, fitMode, { width: pageWidth, height: pageHeight });
        canvas.style.width = `${page.width}px`;
        canvas.style.height = `${page.height}px`;
      });
    }
    fitPages();
    const observer = new ResizeObserver(fitPages);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitMode, status]);

  return (
    <div
      ref={scrollRef}
      className={previewClassName}
    >
      {status === "loading" && (
        <PdfPreviewSkeleton {...skeletonPage}>{skeleton}</PdfPreviewSkeleton>
      )}
      {error && (
        <div role="alert" className="py-8 text-center text-sm text-muted-foreground">
          <p>{error}</p>
          <button type="button" className="mt-3 underline" onClick={() => setRetry((value) => value + 1)}>
            다시 시도
          </button>
        </div>
      )}
      <div
        ref={pagesRef}
        className={`${status === "loading" ? "hidden" : "flex"} flex-col gap-4 min-h-full ${
          fitMode === "fit-page" ? "items-center" : ""
        }`}
      />
      <div className="sticky bottom-2 z-10 flex justify-center">
        <div className="flex items-center gap-1 bg-black/70 dark:bg-white/80 backdrop-blur-xl rounded-full p-1.5 shadow-xl shadow-black/20 dark:shadow-black/40">
          <IslandButton
            onClick={handleDownload}
            disabled={!enabled || isGenerating || status !== "ready"}
            title="PDF 다운로드"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </IslandButton>
          <div className="w-px h-4 bg-white/20 dark:bg-black/15 mx-0.5" />
          <IslandButton
            active={fitMode === "fit-page"}
            onClick={() => setFitMode("fit-page")}
            title="화면 맞춤"
          >
            <Maximize className="size-4" />
          </IslandButton>
          <IslandButton
            active={fitMode === "fit-width"}
            onClick={() => setFitMode("fit-width")}
            title="좌우 맞춤"
          >
            <ArrowLeftRight className="size-4" />
          </IslandButton>
        </div>
      </div>
    </div>
  );
}
