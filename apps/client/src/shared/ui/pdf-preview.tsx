import { useEffect, useRef, useState } from "react";
import { Maximize, ArrowLeftRight, Download, Loader2 } from "lucide-react";
import { getPdfRuntime } from "./pdf-runtime";
import { Skeleton } from "./skeleton";
import { cn } from "@/shared/utils/classnames";
import { downloadBlob } from "@/shared/utils/download";

type FitMode = "fit-page" | "fit-width";

function PdfPreviewSkeleton() {
  return (
    <div role="status" className="absolute inset-0 flex items-center justify-center p-8">
      <span className="sr-only">견적서 미리보기를 준비하고 있습니다.</span>
      <div
        aria-hidden="true"
        className="flex aspect-[595/842] h-full max-h-112 max-w-full flex-col gap-6 rounded border border-border/60 bg-background p-7 shadow-sm [&_[data-slot=skeleton]]:rounded-sm [&_[data-slot=skeleton]]:motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between gap-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          {[0, 1].map((column) => (
            <div key={column} className="space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-3 border-y border-border/60 py-3">
          <Skeleton className="h-5 w-full" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center justify-between gap-6">
              <Skeleton className="h-2 w-3/5" />
              <Skeleton className="h-2 w-1/5" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-2/3" />
          <Skeleton className="h-2 w-1/2" />
        </div>
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

interface PdfPreviewProps {
  /** PDF Blob을 생성하는 함수 */
  generateBlob: () => Promise<Blob>;
  /** 다운로드 시 파일명 */
  downloadFileName?: string;
  /** 재렌더링 트리거용 의존성 키 (예: JSON.stringify(data)) */
  dependencyKey: string;
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
}: PdfPreviewProps) {
  const [fitMode, setFitMode] = useState<FitMode>("fit-width");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [renderWidth, setRenderWidth] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generateRef = useRef(generateBlob);
  const blobRef = useRef<{ key: string; blob: Blob } | null>(null);

  useEffect(() => { generateRef.current = generateBlob; }, [generateBlob]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // 모바일에서 숨겨진 미리보기는 폰트·PDF를 준비하지 않는다.
      setRenderWidth(container.clientHeight > 0 ? Math.max(0, container.clientWidth - 32) : 0);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      const width = Math.max(1, container.clientWidth - 32);
      const height = Math.max(1, container.clientHeight - 32);
      pagesRef.current?.querySelectorAll("canvas").forEach((canvas) => {
        const pageWidth = Number(canvas.dataset.pageWidth);
        const pageHeight = Number(canvas.dataset.pageHeight);
        const scale = fitMode === "fit-width" ? width / pageWidth
          : Math.min(width / pageWidth, height / pageHeight);
        canvas.style.width = `${pageWidth * scale}px`;
        canvas.style.height = `${pageHeight * scale}px`;
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
      className="relative flex-1 overflow-y-auto hide-scrollbar bg-background-secondary dark:bg-secondary/50 p-4"
    >
      {status === "loading" && (
        <PdfPreviewSkeleton />
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
        className={`flex flex-col gap-4 min-h-full ${
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
