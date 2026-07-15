import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { uploadFile, STORAGE_CONFIG } from "../lib/storage";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";
import { randomUUID } from "crypto";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

// 에디터 이미지로 허용하는 확장자 (SVG는 stored XSS 여지로 불허)
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

// POST / — 에디터 이미지 업로드 (BlockNote용)
app.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return errorResponse(c, ERRORS.VALIDATION, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > STORAGE_CONFIG.MAX_EDITOR_IMAGE_SIZE_MB * 1024 * 1024) {
    return errorResponse(c, ERRORS.FILE_TOO_LARGE, 400, `파일 크기가 ${STORAGE_CONFIG.MAX_EDITOR_IMAGE_SIZE_MB}MB를 초과합니다.`);
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return errorResponse(c, ERRORS.VALIDATION, 400, "이미지 파일(jpg, png, gif, webp)만 업로드할 수 있습니다.");
  }

  const uuid = randomUUID();
  const s3Key = `editor/${uuid}.${ext}`;

  await uploadFile(s3Key, buffer, file.type);

  const url = `/api/uploads/${s3Key}`;

  return successResponse(c, { url }, 201);
});

// GET /uploads/:key+ — 업로드된 에디터 이미지 서빙
app.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");

  // 이 라우트는 에디터 이미지 전용 — 다른 스토리지 영역 접근 차단
  if (!key.startsWith("editor/")) {
    return errorResponse(c, ERRORS.NOT_FOUND, 404);
  }

  const { getFile } = await import("../lib/storage");

  try {
    const { stream, contentType } = await getFile(key);

    return new Response(stream as any, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return errorResponse(c, ERRORS.NOT_FOUND, 404);
  }
});

export default app;
