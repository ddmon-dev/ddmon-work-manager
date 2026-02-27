import { api } from "@/shared/lib/api-client";
import type { Todo, TodoWithTimeBlocks, TimeBlock } from "./types";

export async function fetchTodos(date: string): Promise<TodoWithTimeBlocks[]> {
  return api.get<TodoWithTimeBlocks[]>("/todos", { date });
}

export async function fetchIncompleteTodos(before: string): Promise<Todo[]> {
  return api.get<Todo[]>("/todos/incomplete", { before });
}

export async function createTodo(data: {
  content: string;
  todoDate: string;
  sortOrder: number;
}): Promise<Todo> {
  return api.post<Todo>("/todos", data);
}

export async function updateTodo(
  id: string,
  data: Partial<Pick<Todo, "content" | "completed" | "sortOrder" | "color">>
): Promise<Todo> {
  return api.patch<Todo>(`/todos/${id}`, data);
}

export async function deleteTodo(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/todos/${id}`);
}

export async function upsertTimeBlock(
  todoId: string,
  data: { blockDate: string; startSlot: number; durationSlots?: number }
): Promise<TimeBlock> {
  return api.put<TimeBlock>(`/todos/${todoId}/time-block`, data);
}

export async function deleteTimeBlock(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/todos/time-blocks/${id}`);
}

export async function carryOverTodos(
  todoIds: string[],
  targetDate: string
): Promise<{ count: number; targetDate: string }> {
  return api.post<{ count: number; targetDate: string }>("/todos/carry-over", {
    todoIds,
    targetDate,
  });
}
