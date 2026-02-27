import type { ActionResult } from "@work-manager/types";

/**
 * Result 헬퍼 객체
 * 서버/클라이언트 모두에서 일관된 결과 반환을 위한 유틸리티
 */
export const Result = {
  success: <T>(data: T): ActionResult<T> => ({
    success: true,
    data,
  }),

  ok: (): ActionResult<void> => ({
    success: true,
    data: undefined,
  }),

  error: <T = void>(error: string): ActionResult<T> => ({
    success: false,
    error,
  }),
};
