import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { uploadFile, STORAGE_CONFIG } from "../lib/storage";
import { successResponse, errorResponse, ERRORS } from "../lib/errors";
import type { AppVariables } from "../lib/types";
import { randomUUID } from "crypto";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", requireAuth);

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

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const uuid = randomUUID();
  const s3Key = `editor/${uuid}${ext ? `.${ext}` : ""}`;

  await uploadFile(s3Key, buffer, file.type);

  const url = `/api/uploads/${s3Key}`;

  return successResponse(c, { url }, 201);
});

// GET /uploads/:key+ — 업로드된 파일 서빙
app.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const { getFile } = await import("../lib/storage");

  try {
    const { stream, contentType } = await getFile(key);

    return new Response(stream as any, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return errorResponse(c, ERRORS.NOT_FOUND, 404);
  }
});

export default app;
