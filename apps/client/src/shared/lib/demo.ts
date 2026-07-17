import { toast } from "sonner";
import { DEMO_MESSAGES } from "@packages/types";

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

/**
 * 데모에서 차단되는 삭제 동작의 사전 안내.
 * 낙관적 업데이트 경로는 서버 응답 전에 UI를 갱신하므로, 요청 전에 안내하고
 * 중단해야 삭제됐다가 원복되는 플리커가 생기지 않는다.
 * true를 반환하면 호출부는 요청을 중단한다.
 */
export function blockedDeleteInDemo(): boolean {
  if (!IS_DEMO) return false;
  toast.error(DEMO_MESSAGES.DELETE_BLOCKED);
  return true;
}
