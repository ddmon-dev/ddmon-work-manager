import type { Context } from "hono";

export const ERRORS = {
  UNAUTHORIZED: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "리소스를 찾을 수 없습니다.",
  },
  VALIDATION: {
    code: "VALIDATION_ERROR",
    message: "입력값이 올바르지 않습니다.",
  },
  CREATE_FAILED: { code: "CREATE_FAILED", message: "생성에 실패했습니다." },
  UPDATE_FAILED: { code: "UPDATE_FAILED", message: "수정에 실패했습니다." },
  DELETE_FAILED: { code: "DELETE_FAILED", message: "삭제에 실패했습니다." },
  UNEXPECTED: {
    code: "UNEXPECTED_ERROR",
    message: "예기치 않은 오류가 발생했습니다.",
  },
} as const;

export function successResponse<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true, data }, status);
}

export function errorResponse(
  c: Context,
  error: { code: string; message: string },
  status: 400 | 401 | 403 | 404 | 500 = 500,
  detail?: string
) {
  return c.json(
    { success: false, error: error.code, message: detail ?? error.message },
    status
  );
}
