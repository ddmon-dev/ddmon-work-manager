import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/utils/classnames";
import { useTodo } from "../context";
import { TODO_COLORS, TODO_COLOR_STYLES } from "../types";
import type { Todo, TodoColor } from "../types";

interface TodoItemProps {
  todo: Todo;
}

function slotToTime(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}

export function TodoItem({ todo }: TodoItemProps) {
  const { toggleComplete, deleteTodo, updateColor, updateContent, timeBlocks } =
    useTodo();
  const block = timeBlocks.find((b) => b.todoId === todo.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `todo-${todo.id}`,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const color = (todo.color ?? "slate") as TodoColor;
  const colorStyle = TODO_COLOR_STYLES[color] ?? TODO_COLOR_STYLES.slate;

  function startEditing() {
    if (todo.completed) return;
    setEditValue(todo.content);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== todo.content) {
      updateContent(todo.id, trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditValue(todo.content);
    setIsEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      className={cn(
        "group flex items-center gap-2 py-1.5 px-2 rounded-md",
        "hover:bg-muted/50 transition-colors",
        isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      {/* 색상 선택 dot */}
      <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0 ring-offset-background transition-shadow",
                "hover:ring-2 hover:ring-offset-1 hover:ring-border focus:outline-none",
                colorStyle.dot
              )}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="right">
            <div className="flex gap-1.5 flex-wrap max-w-[120px]">
              {TODO_COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none",
                    TODO_COLOR_STYLES[c].dot,
                    color === c &&
                      "ring-2 ring-offset-1 ring-foreground scale-110"
                  )}
                  onClick={() => updateColor(todo.id, c)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 체크박스 */}
      <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => toggleComplete(todo.id)}
          className="shrink-0"
        />
      </div>

      {/* 내용 */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          onBlur={saveEdit}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 text-sm leading-snug min-w-0 bg-transparent outline-none border-b border-primary/30 py-0"
        />
      ) : (
        <span
          onDoubleClick={startEditing}
          className={cn(
            "flex-1 text-sm leading-snug break-words min-w-0",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          {todo.content}
        </span>
      )}

      {/* 타임라인 배치 시간 뱃지 */}
      {block && (
        <span className="text-[10px] leading-none text-muted-foreground shrink-0">
          {slotToTime(block.startSlot)}
        </span>
      )}

      {/* 삭제 버튼 */}
      <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => deleteTodo(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
