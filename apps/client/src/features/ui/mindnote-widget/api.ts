import { api } from "@/shared/lib/api-client";
import type { Mindnote } from "./types";

export async function fetchMindnotes(): Promise<Mindnote[]> {
  const { items } = await api.get<{ items: Mindnote[] }>("/mindnotes");
  return items;
}

export async function fetchRandomMindnote(): Promise<Mindnote | null> {
  const { mindnote } = await api.get<{ mindnote: Mindnote | null }>("/mindnotes/random");
  return mindnote;
}

export async function createMindnote(content: string): Promise<Mindnote> {
  return api.post<Mindnote>("/mindnotes", { content });
}

export async function updateMindnote(id: string, content: string): Promise<Mindnote> {
  return api.patch<Mindnote>(`/mindnotes/${id}`, { content });
}

export async function deleteMindnote(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/mindnotes/${id}`);
}
