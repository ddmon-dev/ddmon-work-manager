import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CornerDownLeft } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { useTodo } from "../context";
import { TodoItem } from "./todo-item";
import { CarryOverBanner } from "./carry-over-banner";

export function TodoList() {
  const { todos, addTodo } = useTodo();
  const [inputValue, setInputValue] = useState("");

  const { setNodeRef: setDroppableRef } = useDroppable({ id: "todo-list" });

  const handleAdd = async () => {
    const content = inputValue.trim();
    if (!content) return;
    setInputValue("");
    await addTodo(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 IME 조합 중 Enter 무시
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const sortableIds = todos.map((t) => `todo-${t.id}`);

  return (
    <div className="flex flex-col h-full">
      {/* 항시 노출 입력창 */}
      <div className="p-3 border-b">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="할 일 추가..."
            className="h-8 text-sm pr-8"
          />
          <CornerDownLeft className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>
      </div>

      {/* 미완료 이월 배너 */}
      <CarryOverBanner />

      {/* 투두 목록 */}
      <div
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </SortableContext>

        {todos.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            위에서 할 일을 입력해보세요
          </div>
        )}
      </div>
    </div>
  );
}
