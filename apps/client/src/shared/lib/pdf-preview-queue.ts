/** 생성 작업은 하나만 실행하고, 그동안 들어온 요청은 최신 값으로 합친다. */
export function createPdfPreviewQueue<Request, Frame>(options: {
  render: (request: Request, signal: AbortSignal) => Promise<Frame>;
  commit: (frame: Frame, request: Request) => void;
  onError: (error: unknown) => void;
  debounceMs?: number;
}) {
  let revision = 0;
  let pending: { request: Request; revision: number } | undefined;
  let active: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function drain() {
    if (active || timer || !pending) return;
    const job = pending;
    pending = undefined;
    const controller = new AbortController();
    active = controller;
    try {
      const frame = await options.render(job.request, controller.signal);
      if (!controller.signal.aborted && job.revision === revision) options.commit(frame, job.request);
    } catch (error) {
      if (!controller.signal.aborted && job.revision === revision) options.onError(error);
    } finally {
      active = undefined;
      void drain();
    }
  }

  return {
    update(request: Request) {
      pending = { request, revision: ++revision };
      active?.abort();
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void drain();
      }, options.debounceMs ?? 150);
    },
    clear() {
      ++revision;
      pending = undefined;
      active?.abort();
      clearTimeout(timer);
      timer = undefined;
    },
  };
}
