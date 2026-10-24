import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Maximize, ArrowLeftRight, Download, Loader2 } from "lucide-react";
import { getPdfRuntime } from "./pdf-runtime";
import { PDF_PREVIEW_PADDING, getPdfPageSize, type PdfFitMode } from "./pdf-preview-layout";
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

/** 견적 상세 API를 기다리는 동안에도 PDF와 같은 프리뷰 영역을 사용한다. */
export function PdfPreviewPlaceholder({ skeleton }: { skeleton: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = usePreviewSize(ref);
  const page = getPdfPageSize(viewport.width, viewport.height, "fit-width");
  return <div ref={ref} className={previewClassName}><PdfPreviewSkeleton {...page}>{skeleton}</PdfPreviewSkeleton></div>;
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

interface PdfPreviewProps {
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
      setError(cause instanceof Error ? cause.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (renderWidth <= 0) return;
    let cancelled = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    let rendering: import("pdfjs-dist").RenderTask | undefined;
    const generate = generateRef.current;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      rendering?.cancel();
      void task?.destroy();
      setError("미리보기 로딩 시간이 초과되었습니다. 다시 시도해 주세요.");
      setStatus("error");
    }, 30_000);

    async function render() {
      // 빠른 폼 입력은 마지막 값만 생성한다. 상세 미리보기도 같은 경로를 사용한다.
      setStatus("loading");
      setError("");
      pagesRef.current?.replaceChildren();
      try {
        const [blob, { pdfjs, worker }] = await Promise.all([generate(), getPdfRuntime()]);
        if (cancelled) return;
        blobRef.current = { key: dependencyKey, blob };
        const data = await blob.arrayBuffer();
        if (cancelled) return;
        task = pdfjs.getDocument({ data, worker });
        const pdf = await task.promise;
        const containerWidth = renderWidth;
        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1 });
          // 폭에 맞춰 한 번 그린 뒤 화면 맞춤은 CSS 크기만 바꾼다.
          const scale = containerWidth / viewport.width * Math.min(window.devicePixelRatio, 2);
          const canvas = document.createElement("canvas");
          const scaled = page.getViewport({ scale });
          canvas.width = Math.ceil(scaled.width);
          canvas.height = Math.ceil(scaled.height);
          const pageSize = getPdfPageSize(containerWidth, Math.max(0, (scrollRef.current?.clientHeight ?? 0) - PDF_PREVIEW_PADDING * 2), fitModeRef.current, viewport);
          canvas.style.width = `${pageSize.width}px`;
          canvas.style.height = `${pageSize.height}px`;
          canvas.dataset.pageWidth = String(viewport.width);
          canvas.dataset.pageHeight = String(viewport.height);
          canvas.className = "shadow-lg rounded";
          rendering = page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: scaled });
          await rendering.promise;
          if (cancelled) return;
          fragment.appendChild(canvas);
        }
        pagesRef.current?.replaceChildren(fragment);
        setStatus("ready");
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "PDF 미리보기를 불러오지 못했습니다.");
          setStatus("error");
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) void task?.destroy();
      }
    }

    const timer = setTimeout(() => { void render(); }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(timeout);
      rendering?.cancel();
      void task?.destroy();
    };
  }, [dependencyKey, retry, renderWidth]);

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
            disabled={isGenerating || status !== "ready"}
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
