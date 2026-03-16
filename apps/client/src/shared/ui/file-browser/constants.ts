import type { LucideIcon } from "lucide-react";
import {
  FolderPlus,
  FolderOpen,
  Eye,
  Download,
  Upload,
  Pencil,
  Trash2,
  FolderInput,
  Copy,
  ClipboardPaste,
  CopyPlus,
  Star,
  StarOff,
} from "lucide-react";

// ─── 액션 정의 (아이콘 + 라벨 + 단축키) ───

interface FileAction {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
}

export const FILE_ACTIONS = {
  OPEN_FOLDER: { icon: FolderOpen, label: "열기", shortcut: "⌘O" },
  OPEN_FILE: { icon: Eye, label: "열기", shortcut: "⌘O" },
  DOWNLOAD: { icon: Download, label: "다운로드" },
  NEW_FOLDER: { icon: FolderPlus, label: "새 폴더", shortcut: "⇧N" },
  UPLOAD: { icon: Upload, label: "파일 업로드" },
  RENAME: { icon: Pencil, label: "이름 변경", shortcut: "⏎" },
  DELETE: { icon: Trash2, label: "삭제", shortcut: "⌘⌫" },
  COPY: { icon: Copy, label: "복사", shortcut: "⌘C" },
  DUPLICATE: { icon: CopyPlus, label: "복제", shortcut: "⌘D" },
  PASTE: { icon: ClipboardPaste, label: "붙여넣기", shortcut: "⌘V" },
  MOVE_PASTE: { icon: FolderInput, label: "잘라넣기", shortcut: "⌥⌘V" },
  FAVORITE_ADD: { icon: Star, label: "즐겨찾기 추가" },
  FAVORITE_REMOVE: { icon: StarOff, label: "즐겨찾기 해제" },
} as const satisfies Record<string, FileAction>;

// ─── 동적 라벨 ───

export function multiLabel(action: string, count: number) {
  return `${count}개 항목 ${action}`;
}

// ─── 토스트/대화 메시지 ───

export const FILE_MESSAGES = {
  // 토스트 성공
  MOVED: "이동했습니다.",
  MOVED_MULTI: (count: number) => `${count}개 항목을 이동했습니다.`,
  COPIED_TO_CLIPBOARD: (count: number) =>
    `${count}개 항목을 클립보드에 복사했습니다.`,
  PASTED_COPY: "붙여넣기 완료 (복사)",
  PASTED_MOVE: "붙여넣기 완료 (이동)",
  DUPLICATED: "복제했습니다.",
  DELETED_PERMANENT: "영구 삭제했습니다.",
  MOVED_TO_TRASH: "휴지통으로 이동했습니다.",
  FAVORITE_ADDED: "즐겨찾기에 추가했습니다.",
  FAVORITE_REMOVED: "즐겨찾기를 해제했습니다.",
  // 토스트 실패
  PASTE_FAILED: "붙여넣기에 실패했습니다.",
  MOVE_PASTE_FAILED: "잘라넣기에 실패했습니다.",
  DUPLICATE_FAILED: "복제에 실패했습니다.",
  FAVORITE_FAILED: "즐겨찾기 변경에 실패했습니다.",
  DELETE_FAILED: "삭제에 실패했습니다.",
  // 대화 타이틀
  RENAME_FAILED_TITLE: "이름 변경 실패",
  RENAME_FAILED_DESC: "이름 변경에 실패했습니다.",
  MOVE_FAILED_TITLE: "이동 실패",
  MOVE_FAILED_DESC: "이동에 실패했습니다.",
  PASTE_BLOCKED_TITLE: "붙여넣기 불가",
  PASTE_BLOCKED_DESC: "항목을 자기 자신 내부에 붙여넣을 수 없습니다.",
  // 삭제 확인
  DELETE_CONFIRM_PERMANENT: "영구 삭제",
  DELETE_CONFIRM_TRASH: "휴지통으로 이동",
  DELETE_CONFIRM_PERMANENT_DESC: (count: number) =>
    `선택한 ${count}개 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
  DELETE_CONFIRM_TRASH_DESC: (count: number) =>
    `선택한 ${count}개 항목을 휴지통으로 이동하시겠습니까?`,
} as const;
