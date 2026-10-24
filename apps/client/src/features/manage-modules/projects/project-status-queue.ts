import type { ProjectStatus, WorkPhase } from "./types";

export type ProjectStatusPatch = { status?: ProjectStatus; workPhase?: WorkPhase };
export type ProjectSaveState = "idle" | "saving" | "error";

type PendingChange<T> = {
  patch: ProjectStatusPatch;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type Entry<T> = {
  confirmed: ProjectStatusPatch;
  inFlight: ProjectStatusPatch | null;
  pending: PendingChange<T>[];
  state: ProjectSaveState;
  revision: number;
};

/** 같은 프로젝트만 순서대로 저장한다. 화면은 대기 중인 마지막 선택까지 반영한다. */
export function createProjectStatusQueue<T extends ProjectStatusPatch>(options: {
  save: (id: string, patch: ProjectStatusPatch) => Promise<T>;
  onChange: (id: string, patch: ProjectStatusPatch) => void;
  onIdle: () => void;
  onError: (error: unknown) => void;
}) {
  const entries = new Map<string, Entry<T>>();
  let revision = 0;

  const projected = (entry: Entry<T>): ProjectStatusPatch =>
    Object.assign({}, entry.confirmed, entry.inFlight, ...entry.pending.map((change) => change.patch));

  function publish(id: string, entry: Entry<T>) {
    entry.revision = ++revision;
    options.onChange(id, projected(entry));
  }

  async function drain(id: string, entry: Entry<T>) {
    while (entry.pending.length) {
      // 아직 보내지 않은 같은 필드의 변경은 마지막 선택으로 합친다.
      const batch = entry.pending.splice(0);
      const patch: ProjectStatusPatch = Object.assign({}, ...batch.map((change) => change.patch));
      entry.inFlight = patch;
      try {
        const saved = await options.save(id, patch);
        entry.confirmed = { status: saved.status, workPhase: saved.workPhase };
        entry.state = "idle";
        batch.forEach((change) => change.resolve(saved));
      } catch (error) {
        const newer = Object.assign({}, ...entry.pending.map((change) => change.patch));
        const superseded = Object.keys(patch).every((key) => key in newer);
        entry.state = superseded ? "idle" : "error";
        if (!superseded) options.onError(error);
        batch.forEach((change) => change.reject(error));
      } finally {
        entry.inFlight = null;
        if (entry.pending.length) entry.state = "saving";
        publish(id, entry);
      }
    }

    if (![...entries.values()].some((item) => item.inFlight || item.pending.length)) {
      options.onIdle();
    }
  }

  return {
    get revision() { return revision; },
    getState(id: string): ProjectSaveState { return entries.get(id)?.state ?? "idle"; },
    enqueue(id: string, patch: ProjectStatusPatch, initial: ProjectStatusPatch): Promise<T> {
      let entry = entries.get(id);
      if (!entry) {
        entry = { confirmed: initial, inFlight: null, pending: [], state: "idle", revision };
        entries.set(id, entry);
      } else if (!entry.inFlight && !entry.pending.length) {
        entry.confirmed = initial;
      }
      const current = entry;
      const promise = new Promise<T>((resolve, reject) => {
        current.pending.push({ patch, resolve, reject });
      });
      current.state = "saving";
      publish(id, current);
      if (!current.inFlight) void drain(id, current);
      return promise;
    },
    overlay<U extends { id: string }>(item: U, readRevision: number): U {
      const entry = entries.get(item.id);
      // 조회 이후 발생한 저장과 아직 저장 중인 선택은 오래된 조회 응답보다 우선한다.
      return entry && (entry.inFlight || entry.pending.length || entry.revision > readRevision)
        ? { ...item, ...projected(entry) }
        : item;
    },
  };
}
