import { mkdir, writeFile, unlink, stat } from "fs/promises";
import { createReadStream } from "fs";
import { join, dirname, extname } from "path";
import type { Readable } from "stream";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "../../storage";

function resolve(key: string) {
  return join(STORAGE_DIR, key);
}

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

function mimeFromKey(key: string): string {
  const ext = extname(key).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function ensureStorageDir() {
  await mkdir(join(STORAGE_DIR, "files"), { recursive: true });
  await mkdir(join(STORAGE_DIR, "editor"), { recursive: true });
  console.log(`[Storage] Directory ready: ${STORAGE_DIR}`);
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string
) {
  const filePath = resolve(key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
}

export async function deleteFile(key: string) {
  try {
    await unlink(resolve(key));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}

export async function getFile(key: string): Promise<{
  stream: Readable;
  contentType: string;
  size: number;
}> {
  const filePath = resolve(key);
  const stats = await stat(filePath);
  const stream = createReadStream(filePath);
  return {
    stream,
    contentType: mimeFromKey(key),
    size: stats.size,
  };
}
