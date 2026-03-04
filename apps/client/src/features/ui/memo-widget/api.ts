import { api } from "@/shared/lib/api-client";
import type { Memo } from "./types";

export async function fetchMemos(): Promise<Memo[]> {
  const { items } = await api.get<{ items: Memo[] }>("/memos");
  return items;
}

export async function createMemo(content: string): Promise<Memo> {
  return api.post<Memo>("/memos", { content });
}

export async function updateMemo(id: string, content: string): Promise<Memo> {
  return api.patch<Memo>(`/memos/${id}`, { content });
}

export async function deleteMemo(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/memos/${id}`);
}
