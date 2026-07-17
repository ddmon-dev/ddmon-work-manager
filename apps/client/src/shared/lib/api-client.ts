import { APP_CONFIG } from "@/app.config";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.API.TIMEOUT);

  try {
    const res = await fetch(`${APP_CONFIG.API.BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    });

    if (res.status === 401) {
      window.location.href = APP_CONFIG.AUTH.PATHS.SIGN_IN;
      throw new Error("Unauthorized");
    }

    if (res.status === 403) {
      window.location.href = APP_CONFIG.AUTH.PATHS.FORBIDDEN;
      throw new Error("Forbidden");
    }

    const json = (await res.json()) as ApiResponse<T>;

    if (!json.success) {
      throw new Error((json as { success: false; message: string }).message || json.error);
    }

    return (json as { success: true; data: T }).data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params?: Params): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/** 서버가 내려준 에러 메시지가 있으면 그대로, 없으면 fallback 문구를 반환한다. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const api = {
  get: <T>(path: string, params?: Params) =>
    request<T>(`${path}${buildQuery(params)}`),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
