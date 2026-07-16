export { getFileIconComponent, type FileItem } from "@/shared/lib/file-types";

// 휴지통 아이템
export interface TrashItem {
  id: string;
  type: "document" | "file";
  deletedAt: string;
  name?: string;
  isFolder?: boolean;
  mimeType?: string | null;
  size?: number | null;
}
