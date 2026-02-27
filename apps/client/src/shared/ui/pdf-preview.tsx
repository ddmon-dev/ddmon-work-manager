import { useEffect, useRef, useCallback, useState } from "react";
import { Maximize, ArrowLeftRight, Download, Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { downloadBlob } from "@/shared/utils/download";

type FitMode = "fit-page" | "fit-width";

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
 * offscreen canvas에 먼저 그린 후 visible canvas로 복사하여 깜빡임 방지.
 */
export function PdfPreview({
  generateBlob,
  downloadFileName,
  dependencyKey,
}: PdfPreviewProps) {
  const [fitMode, setFitMode] = useState<FitMode>("fit-width");
  const [isGenerating, setIsGenerating] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const prevKeyRef = useRef("");
  const generationRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const blob = await generateBlob();
      downloadBlob(blob, downloadFileName ?? "document.pdf");
    } finally {
      setIsGenerating(false);
    }
  }

  const renderToCanvas = useCallback(
    async (gen: number, mode: FitMode) => {
      const blob = await generateBlob();

      if (gen !== generationRef.current) return;

      const arrayBuffer = await blob.arrayBuffer();

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      if (gen !== generationRef.current) {
        pdfDoc.destroy();
        return;
      }

      const scrollContainer = scrollRef.current;
      const containerWidth = (scrollContainer?.clientWidth ?? 500) - 32;
      const containerHeight = (scrollContainer?.clientHeight ?? 700) - 32;
      const fragment = document.createDocumentFragment();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);

        if (gen !== generationRef.current) {
          pdfDoc.destroy();
          return;
        }

        const viewport = page.getViewport({ scale: 1 });

        let scale: number;
        if (mode === "fit-width") {
          scale = (containerWidth * window.devicePixelRatio) / viewport.width;
        } else {
          const scaleW = containerWidth / viewport.width;
          const scaleH = containerHeight / viewport.height;
          scale = Math.min(scaleW, scaleH) * window.devicePixelRatio;
        }

        const scaledViewport = page.getViewport({ scale });

        const offscreen = document.createElement("canvas");
        offscreen.width = scaledViewport.width;
        offscreen.height = scaledViewport.height;
        const offCtx = offscreen.getContext("2d")!;

        await page.render({
          canvasContext: offCtx,
          viewport: scaledViewport,
          canvas: offscreen,
        }).promise;

        if (gen !== generationRef.current) {
          pdfDoc.destroy();
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${scaledViewport.width / window.devicePixelRatio}px`;
        canvas.style.height = `${scaledViewport.height / window.devicePixelRatio}px`;
        canvas.className = "shadow-lg rounded";
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(offscreen, 0, 0);

        fragment.appendChild(canvas);
      }

      if (gen !== generationRef.current) {
        pdfDoc.destroy();
        return;
      }

      const pagesContainer = pagesRef.current;
      if (pagesContainer) {
        pagesContainer.replaceChildren(fragment);
      }

      pdfDoc.destroy();
    },
    [generateBlob]
  );

  useEffect(() => {
    const key = `${dependencyKey}__${fitMode}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const gen = ++generationRef.current;
    renderToCanvas(gen, fitMode).catch(() => {});
  });

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto hide-scrollbar bg-background-secondary dark:bg-secondary/50 p-4"
    >
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
            disabled={isGenerating}
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
