export type ManageAction = "view" | "modify" | "create" | "delete" | "clone";
export type ManageSheetMode = Exclude<ManageAction, "delete">;

export interface MemoItem {
  id: string;
  content: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}
