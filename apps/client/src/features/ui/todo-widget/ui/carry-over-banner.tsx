import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Check, Trash2, X, ChevronsRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/classnames";
import { useTodo } from "../context";
import { TODO_COLOR_STYLES } from "../types";
import type { Todo, TodoColor } from "../types";

const VISIBLE_LIMIT = 5;

function formatShortDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function CarryOverItem({ todo }: { todo: Todo }) {
  const { toggleComplete, deleteTodo } = useTodo();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `carry-${todo.id}`,
    });

  const color = (todo.color ?? "slate") as TodoColor;
  const colorStyle = TODO_COLOR_STYLES[color] ?? TODO_COLOR_STYLES.slate;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-2 py-1 px-2 rounded-md",
        "hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", colorStyle.dot)} />
      <span className="flex-1 text-xs leading-snug truncate">
        {todo.content}
      </span>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {formatShortDate(todo.todoDate)}
      </span>

      {/* hover 시 액션 버튼 */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-green-600"
          onClick={() => toggleComplete(todo.id)}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={() => deleteTodo(todo.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function CarryOverBanner() {
  const { incompleteTodos, carryOverAll, dismissCarryOver } = useTodo();
  const [expanded, setExpanded] = useState(false);

  if (incompleteTodos.length === 0) return null;

  const hasMore = incompleteTodos.length > VISIBLE_LIMIT;
  const visibleTodos = expanded
    ? incompleteTodos
    : incompleteTodos.slice(0, VISIBLE_LIMIT);

  return (
    <div className="border-b bg-muted/30">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-medium text-muted-foreground">
          미완료 {incompleteTodos.length}건
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={carryOverAll}
          >
            <ChevronsRight className="h-3 w-3 mr-1" />
            전체 이월
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={dismissCarryOver}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 미완료 투두 목록 */}
      <div className="px-1 pb-1.5">
        {visibleTodos.map((todo) => (
          <CarryOverItem key={todo.id} todo={todo} />
        ))}
        {hasMore && !expanded && (
          <button
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
            onClick={() => setExpanded(true)}
          >
            +{incompleteTodos.length - VISIBLE_LIMIT}건 더 보기
          </button>
        )}
      </div>
    </div>
  );
}
