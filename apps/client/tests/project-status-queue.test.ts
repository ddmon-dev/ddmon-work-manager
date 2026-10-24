import assert from "node:assert/strict";
import { test } from "node:test";
import { createProjectStatusQueue, type ProjectStatusPatch } from "../src/features/manage-modules/projects/project-status-queue";

type Saved = { status: "pending" | "active" | "settling"; workPhase: "preparing" | "working" };
const initial: Saved = { status: "pending", workPhase: "preparing" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
function setup() {
  const requests: { id: string; patch: ProjectStatusPatch; response: ReturnType<typeof deferred<Saved>> }[] = [];
  const displayed = new Map<string, ProjectStatusPatch>();
  const errors: unknown[] = [];
  let idle = 0;
  const queue = createProjectStatusQueue<Saved>({
    save: (id, patch) => {
      const response = deferred<Saved>();
      requests.push({ id, patch, response });
      return response.promise;
    },
    onChange: (id, patch) => displayed.set(id, patch),
    onIdle: () => { idle++; },
    onError: (error) => errors.push(error),
  });
  return { queue, requests, displayed, errors, get idle() { return idle; } };
}

test("연속 조작은 즉시 반영하고 같은 프로젝트의 대기 변경은 마지막 선택으로 합친다", async () => {
  const s = setup();
  const first = s.queue.enqueue("a", { status: "active" }, initial);
  const second = s.queue.enqueue("a", { status: "settling" }, initial);
  const third = s.queue.enqueue("a", { status: "pending", workPhase: "working" }, initial);
  assert.equal(s.requests.length, 1);
  assert.deepEqual(s.displayed.get("a"), { status: "pending", workPhase: "working" });
  s.requests[0].response.resolve({ ...initial, status: "active" });
  await first;
  assert.equal(s.requests.length, 2);
  assert.deepEqual(s.requests[1].patch, { status: "pending", workPhase: "working" });
  assert.equal(s.displayed.get("a")?.status, "pending");
  s.requests[1].response.resolve({ ...initial, workPhase: "working" });
  await Promise.all([second, third]);
  assert.equal(s.queue.getState("a"), "idle");
  assert.equal(s.idle, 1);
});

test("이전 저장 실패가 더 최신의 선택이나 다른 프로젝트를 되돌리지 않는다", async () => {
  const s = setup();
  const first = s.queue.enqueue("a", { status: "active" }, initial).catch(() => undefined);
  const latest = s.queue.enqueue("a", { status: "settling" }, initial);
  const other = s.queue.enqueue("b", { workPhase: "working" }, initial);
  assert.equal(s.requests.length, 2);
  s.requests[0].response.reject(new Error("첫 요청 실패"));
  await first;
  assert.equal(s.displayed.get("a")?.status, "settling");
  assert.equal(s.displayed.get("b")?.workPhase, "working");
  assert.equal(s.errors.length, 0);
  s.requests[2].response.resolve({ ...initial, status: "settling" });
  s.requests[1].response.resolve({ ...initial, workPhase: "working" });
  await Promise.all([latest, other]);
  assert.equal(s.idle, 1);
});

test("마지막 변경이 실패하면 해당 프로젝트의 저장된 필드만 복구하고 오류를 알린다", async () => {
  const s = setup();
  const result = s.queue.enqueue("a", { status: "active" }, initial);
  const rejected = assert.rejects(result, /저장 실패/);
  s.requests[0].response.reject(new Error("저장 실패"));
  await rejected;
  assert.deepEqual(s.displayed.get("a"), initial);
  assert.equal(s.queue.getState("a"), "error");
  assert.equal(s.errors.length, 1);
});

test("실패한 상태는 복구하면서 뒤이어 선택한 작업단계는 유지한다", async () => {
  const s = setup();
  const first = s.queue.enqueue("a", { status: "active" }, initial).catch(() => undefined);
  const next = s.queue.enqueue("a", { workPhase: "working" }, initial);
  s.requests[0].response.reject(new Error("상태 저장 실패"));
  await first;
  assert.deepEqual(s.displayed.get("a"), { status: "pending", workPhase: "working" });
  assert.equal(s.errors.length, 1);
  s.requests[1].response.resolve({ ...initial, workPhase: "working" });
  await next;
});

test("늦은 조회는 최신 선택을 덮지 않고 저장 후 새 조회는 서버 값을 따른다", async () => {
  const s = setup();
  const oldRevision = s.queue.revision;
  const save = s.queue.enqueue("a", { status: "active" }, initial);
  const duringSave = s.queue.revision;
  const row = { id: "a", ...initial, name: "이름" };
  assert.equal(s.queue.overlay(row, duringSave).status, "active");
  s.requests[0].response.resolve({ ...initial, status: "active" });
  await save;
  assert.equal(s.queue.overlay(row, oldRevision).status, "active");
  assert.equal(s.queue.overlay(row, duringSave).status, "active");
  assert.equal(s.queue.overlay(row, s.queue.revision).status, "pending");
  assert.equal(s.queue.overlay({ ...row, id: "b" }, oldRevision).status, "pending");
});
