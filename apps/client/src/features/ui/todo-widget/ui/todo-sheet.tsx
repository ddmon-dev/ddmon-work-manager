import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/classnames";
import { useTodo } from "../context";
import { TODO_COLOR_STYLES } from "../types";
import type { Todo, TimeBlockWithTodo, TodoColor } from "../types";
import { DateNav } from "./date-nav";
import { TodoList } from "./todo-list";
import { Timeline } from "./timeline";

export function TodoSheet() {
  const {
    isOpen,
    close,
    todos,
    timeBlocks,
    isLoading,
    incompleteTodos,
    placeBlock,
    moveBlock,
    reorderTodos,
    carryOver,
  } = useTodo();
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [activeBlock, setActiveBlock] = useState<TimeBlockWithTodo | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("todo-")) {
      const todoId = id.replace("todo-", "");
      setActiveTodo(todos.find((t) => t.id === todoId) ?? null);
      setActiveBlock(null);
    } else if (id.startsWith("carry-")) {
      const todoId = id.replace("carry-", "");
      setActiveTodo(incompleteTodos.find((t) => t.id === todoId) ?? null);
      setActiveBlock(null);
    } else if (id.startsWith("block-")) {
      const blockId = id.replace("block-", "");
      setActiveBlock(timeBlocks.find((b) => b.id === blockId) ?? null);
      setActiveTodo(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTodo(null);
    setActiveBlock(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // carry -> slot: 이월 + 타임블록 배치
    if (activeId.startsWith("carry-") && overId.startsWith("slot-")) {
      const todoId = activeId.replace("carry-", "");
      const slot = parseInt(overId.replace("slot-", ""), 10);
      carryOver([todoId], { timeSlot: slot });
      return;
    }

    // carry -> todo item: 이월 + 해당 위치에 삽입
    if (activeId.startsWith("carry-") && overId.startsWith("todo-")) {
      const todoId = activeId.replace("carry-", "");
      const overTodoId = overId.replace("todo-", "");
      const insertIndex = todos.findIndex((t) => t.id === overTodoId);
      carryOver([todoId], {
        insertIndex: insertIndex >= 0 ? insertIndex : undefined,
      });
      return;
    }

    // carry -> todo list 영역: 이월 + 목록 하단에 추가
    if (activeId.startsWith("carry-") && overId === "todo-list") {
      const todoId = activeId.replace("carry-", "");
      carryOver([todoId]);
      return;
    }

    // todo -> slot: 타임블록 배치
    if (activeId.startsWith("todo-") && overId.startsWith("slot-")) {
      const todoId = activeId.replace("todo-", "");
      const slot = parseInt(overId.replace("slot-", ""), 10);
      placeBlock(todoId, slot);
      return;
    }

    // block -> slot: 타임블록 이동
    if (activeId.startsWith("block-") && overId.startsWith("slot-")) {
      const blockId = activeId.replace("block-", "");
      const slot = parseInt(overId.replace("slot-", ""), 10);
      moveBlock(blockId, slot);
      return;
    }

    // todo -> todo: 정렬 변경
    if (activeId.startsWith("todo-") && overId.startsWith("todo-")) {
      const fromId = activeId.replace("todo-", "");
      const toId = overId.replace("todo-", "");
      if (fromId !== toId) reorderTodos(fromId, toId);
    }
  };

  // 오버레이에 표시할 투두
  const overlayTodo = activeTodo ?? activeBlock?.todo ?? null;
  const overlayColor = (overlayTodo?.color ?? "slate") as TodoColor;
  const overlayColorStyle =
    TODO_COLOR_STYLES[overlayColor] ?? TODO_COLOR_STYLES.slate;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="md:max-w-[56rem] w-full flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">오늘의 할 일</SheetTitle>
          <DateNav />
        </SheetHeader>

        {!isLoading && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-1 min-h-0 divide-x overflow-hidden">
              <div className="w-2/5 flex flex-col overflow-hidden">
                <TodoList />
              </div>
              <div className="w-3/5 overflow-hidden flex flex-col">
                <Timeline />
              </div>
            </div>

            <DragOverlay>
              {overlayTodo && (
                <div
                  className={cn(
                    "rounded-md px-3 py-1.5 shadow-lg text-sm font-medium border",
                    overlayColorStyle.block,
                    overlayColorStyle.text
                  )}
                >
                  {overlayTodo.content}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </SheetContent>
    </Sheet>
  );
}
