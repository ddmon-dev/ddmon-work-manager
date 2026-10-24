import assert from "node:assert/strict";
import { test } from "node:test";
import { createPdfPreviewQueue } from "../src/shared/lib/pdf-preview-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function setup() {
  const jobs: { value: string; signal: AbortSignal; result: ReturnType<typeof deferred<string>> }[] = [];
  const committed: string[] = [];
  const errors: unknown[] = [];
  const queue = createPdfPreviewQueue<string, string>({
    debounceMs: 0,
    render(value, signal) {
      const result = deferred<string>();
      jobs.push({ value, signal, result });
      return result.promise;
    },
    commit: frame => committed.push(frame),
    onError: error => errors.push(error),
  });
  return { queue, jobs, committed, errors };
}

test("중단 불가능한 생성이 진행 중이어도 작업은 하나만 실행하고 최신 입력만 이어서 처리한다", async () => {
  const s = setup();
  s.queue.update("a");
  await tick();
  s.queue.update("b");
  s.queue.update("c");
  await tick();
  assert.equal(s.jobs.length, 1);
  assert.equal(s.jobs[0].signal.aborted, true);
  s.jobs[0].result.resolve("old");
  await tick();
  assert.deepEqual(s.committed, []);
  assert.equal(s.jobs[1].value, "c");
  s.jobs[1].result.resolve("latest");
  await tick();
  assert.deepEqual(s.committed, ["latest"]);
  s.queue.clear();
});

test("과거 요청의 실패는 무시하고 최신 실패만 알린 뒤 재시도할 수 있다", async () => {
  const s = setup();
  s.queue.update("a");
  await tick();
  s.queue.update("b");
  s.jobs[0].result.reject(new Error("old"));
  await tick();
  assert.equal(s.errors.length, 0);
  s.jobs[1].result.reject(new Error("latest"));
  await tick();
  assert.equal((s.errors[0] as Error).message, "latest");
  s.queue.update("b");
  await tick();
  s.jobs[2].result.resolve("recovered");
  await tick();
  assert.deepEqual(s.committed, ["recovered"]);
  s.queue.clear();
});

test("닫힌 프리뷰의 진행 결과와 대기 작업은 반영하지 않고 다시 열면 재사용할 수 있다", async () => {
  const s = setup();
  s.queue.update("a");
  await tick();
  s.queue.update("b");
  s.queue.clear();
  s.jobs[0].result.resolve("closed");
  await tick();
  assert.equal(s.jobs.length, 1);
  assert.deepEqual(s.committed, []);
  s.queue.update("c");
  await tick();
  s.jobs[1].result.resolve("open");
  await tick();
  assert.deepEqual(s.committed, ["open"]);
  s.queue.clear();
});
