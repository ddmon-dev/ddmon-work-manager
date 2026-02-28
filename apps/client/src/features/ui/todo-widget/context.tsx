import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";

import type { Todo, TimeBlockWithTodo } from "./types";
import {
  fetchTodos,
  fetchIncompleteTodos,
  createTodo as apiCreateTodo,
  updateTodo as apiUpdateTodo,
  deleteTodo as apiDeleteTodo,
  upsertTimeBlock,
  deleteTimeBlock as apiDeleteTimeBlock,
  carryOverTodos as apiCarryOverTodos,
} from "./api";

interface CarryOverOptions {
  insertIndex?: number;
  timeSlot?: number;
}

interface TodoContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  date: Date;
  setDate: (date: Date) => void;
  todos: Todo[];
  timeBlocks: TimeBlockWithTodo[];
  isLoading: boolean;
  addTodo: (content: string) => Promise<void>;
  toggleComplete: (todoId: string) => void;
  updateColor: (todoId: string, color: string) => void;
  updateContent: (todoId: string, content: string) => void;
  deleteTodo: (todoId: string) => Promise<void>;
  reorderTodos: (activeId: string, overId: string) => void;
  placeBlock: (todoId: string, startSlot: number) => void;
  moveBlock: (blockId: string, startSlot: number) => void;
  resizeBlock: (blockId: string, durationSlots: number) => void;
  removeBlock: (blockId: string) => void;
  incompleteTodos: Todo[];
  carryOver: (todoIds: string[], options?: CarryOverOptions) => Promise<void>;
  carryOverAll: () => Promise<void>;
  dismissCarryOver: () => void;
}

const TodoContext = createContext<TodoContextType | null>(null);

export function useTodo() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodo must be used within TodoProvider");
  return ctx;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date>(() => new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockWithTodo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [incompleteTodos, setIncompleteTodos] = useState<Todo[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const pendingSync = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const loadTodos = useCallback(async (targetDate: Date) => {
    setIsLoading(true);
    try {
      const dateStr = formatDate(targetDate);
      const todayStr = formatDate(new Date());
      const isToday = dateStr === todayStr;

      const [items, incompleteItems] = await Promise.all([
        fetchTodos(dateStr),
        isToday ? fetchIncompleteTodos(todayStr) : null,
      ]);

      // 서버 응답: TodoWithTimeBlocks[] → todos + timeBlocks 분리
      const todosData = items.map(({ timeBlocks: _, ...todo }) => todo);
      const blocksData: TimeBlockWithTodo[] = items.flatMap((item) =>
        item.timeBlocks.map((block) => ({
          ...block,
          todo: { ...item, timeBlocks: undefined } as unknown as Todo,
        }))
      );

      setTodos(todosData);
      setTimeBlocks(blocksData);

      if (isToday && incompleteItems) {
        setIncompleteTodos(incompleteItems);
      } else {
        setIncompleteTodos([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : CRUD_ERRORS.READ_FAILED("투두"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 날짜 변경 시 데이터 재조회
  useEffect(() => {
    if (isOpen) {
      loadTodos(date);
    }
  }, [date, isOpen, loadTodos]);

  // Sheet 열릴 때 최초 로드 + dismiss 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setIsDismissed(false);
      loadTodos(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addTodo = useCallback(
    async (content: string) => {
      const maxOrder =
        todos.length > 0 ? Math.max(...todos.map((t) => t.sortOrder)) + 1 : 0;
      try {
        const created = await apiCreateTodo({
          content,
          todoDate: formatDate(date),
          sortOrder: maxOrder,
        });
        setTodos((prev) => [...prev, created]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : CRUD_ERRORS.CREATE_FAILED("투두"));
      }
    },
    [todos, date]
  );

  const toggleComplete = useCallback(
    (todoId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (todo) {
        const newCompleted = !todo.completed;
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todoId ? { ...t, completed: newCompleted } : t
          )
        );
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.todoId === todoId
              ? { ...b, todo: { ...b.todo, completed: newCompleted } }
              : b
          )
        );

        apiUpdateTodo(todoId, { completed: newCompleted }).catch(() => {
          setTodos((prev) =>
            prev.map((t) =>
              t.id === todoId ? { ...t, completed: todo.completed } : t
            )
          );
          setTimeBlocks((prev) =>
            prev.map((b) =>
              b.todoId === todoId
                ? { ...b, todo: { ...b.todo, completed: todo.completed } }
                : b
            )
          );
          toast.error(CRUD_ERRORS.UPDATE_FAILED("투두"));
        });
        return;
      }

      // 미완료 투두 배너에서 완료 처리
      const incompleteTodo = incompleteTodos.find((t) => t.id === todoId);
      if (incompleteTodo) {
        setIncompleteTodos((prev) => prev.filter((t) => t.id !== todoId));
        apiUpdateTodo(todoId, { completed: true }).catch(() => {
          setIncompleteTodos((prev) =>
            [...prev, incompleteTodo].sort(
              (a, b) =>
                a.todoDate.localeCompare(b.todoDate) ||
                a.sortOrder - b.sortOrder
            )
          );
          toast.error(CRUD_ERRORS.UPDATE_FAILED("투두"));
        });
      }
    },
    [todos, incompleteTodos]
  );

  const updateColor = useCallback(
    (todoId: string, color: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;

      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, color } : t))
      );
      setTimeBlocks((prev) =>
        prev.map((b) =>
          b.todoId === todoId ? { ...b, todo: { ...b.todo, color } } : b
        )
      );

      apiUpdateTodo(todoId, { color }).catch(() => {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todoId ? { ...t, color: todo.color } : t
          )
        );
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.todoId === todoId
              ? { ...b, todo: { ...b.todo, color: todo.color } }
              : b
          )
        );
        toast.error(CRUD_ERRORS.UPDATE_FAILED("투두"));
      });
    },
    [todos]
  );

  const updateContent = useCallback(
    (todoId: string, content: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;

      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, content } : t))
      );
      setTimeBlocks((prev) =>
        prev.map((b) =>
          b.todoId === todoId ? { ...b, todo: { ...b.todo, content } } : b
        )
      );

      apiUpdateTodo(todoId, { content }).catch(() => {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todoId ? { ...t, content: todo.content } : t
          )
        );
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.todoId === todoId
              ? { ...b, todo: { ...b.todo, content: todo.content } }
              : b
          )
        );
        toast.error(CRUD_ERRORS.UPDATE_FAILED("투두"));
      });
    },
    [todos]
  );

  const handleDeleteTodo = useCallback(
    async (todoId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (todo) {
        const snapshot = { todos, timeBlocks };
        setTodos((prev) => prev.filter((t) => t.id !== todoId));
        setTimeBlocks((prev) => prev.filter((b) => b.todoId !== todoId));

        try {
          await apiDeleteTodo(todoId);
        } catch {
          setTodos(snapshot.todos);
          setTimeBlocks(snapshot.timeBlocks);
          toast.error(CRUD_ERRORS.DELETE_FAILED("투두"));
        }
        return;
      }

      // 미완료 투두 배너에서 삭제 처리
      const incompleteTodo = incompleteTodos.find((t) => t.id === todoId);
      if (incompleteTodo) {
        setIncompleteTodos((prev) => prev.filter((t) => t.id !== todoId));
        try {
          await apiDeleteTodo(todoId);
        } catch {
          setIncompleteTodos((prev) =>
            [...prev, incompleteTodo].sort(
              (a, b) =>
                a.todoDate.localeCompare(b.todoDate) ||
                a.sortOrder - b.sortOrder
            )
          );
          toast.error(CRUD_ERRORS.DELETE_FAILED("투두"));
        }
      }
    },
    [todos, timeBlocks, incompleteTodos]
  );

  const reorderTodos = useCallback(
    (activeId: string, overId: string) => {
      setTodos((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeId);
        const overIdx = prev.findIndex((t) => t.id === overId);
        if (activeIdx === -1 || overIdx === -1) return prev;

        const newTodos = [...prev];
        const [moved] = newTodos.splice(activeIdx, 1);
        newTodos.splice(overIdx, 0, moved);

        const updated = newTodos.map((t, i) => ({ ...t, sortOrder: i }));

        updated.forEach((t) => {
          const key = `sort-${t.id}`;
          const existing = pendingSync.current.get(key);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            apiUpdateTodo(t.id, { sortOrder: t.sortOrder });
            pendingSync.current.delete(key);
          }, 500);
          pendingSync.current.set(key, timer);
        });

        return updated;
      });
    },
    []
  );

  const placeBlock = useCallback(
    (todoId: string, startSlot: number) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;

      const dateStr = formatDate(date);

      setTimeBlocks((prev) => {
        const existing = prev.find((b) => b.todoId === todoId);
        if (existing) {
          return prev.map((b) =>
            b.todoId === todoId
              ? { ...b, startSlot, blockDate: dateStr }
              : b
          );
        }
        const tempBlock: TimeBlockWithTodo = {
          id: `temp-${todoId}`,
          todoId,
          userId: todo.userId,
          blockDate: dateStr,
          startSlot,
          durationSlots: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          todo,
        };
        return [...prev, tempBlock];
      });

      upsertTimeBlock(todoId, { blockDate: dateStr, startSlot })
        .then((result) => {
          setTimeBlocks((prev) =>
            prev.map((b) =>
              b.id === `temp-${todoId}` ? { ...result, todo } : b
            )
          );
        })
        .catch(() => {
          setTimeBlocks((prev) =>
            prev.filter((b) => b.id !== `temp-${todoId}`)
          );
          toast.error(CRUD_ERRORS.CREATE_FAILED("타임블록"));
        });
    },
    [todos, date]
  );

  const moveBlock = useCallback(
    (blockId: string, startSlot: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;

      setTimeBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, startSlot } : b))
      );

      upsertTimeBlock(block.todoId, {
        blockDate: block.blockDate,
        startSlot,
        durationSlots: block.durationSlots,
      }).catch(() => {
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, startSlot: block.startSlot } : b
          )
        );
        toast.error(CRUD_ERRORS.UPDATE_FAILED("타임블록"));
      });
    },
    [timeBlocks]
  );

  const resizeBlock = useCallback(
    (blockId: string, durationSlots: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;

      setTimeBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, durationSlots } : b))
      );

      upsertTimeBlock(block.todoId, {
        blockDate: block.blockDate,
        startSlot: block.startSlot,
        durationSlots,
      }).catch(() => {
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? { ...b, durationSlots: block.durationSlots }
              : b
          )
        );
        toast.error(CRUD_ERRORS.UPDATE_FAILED("타임블록"));
      });
    },
    [timeBlocks]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      const snapshot = timeBlocks;
      setTimeBlocks((prev) => prev.filter((b) => b.id !== blockId));

      apiDeleteTimeBlock(blockId).catch(() => {
        setTimeBlocks(snapshot);
        toast.error(CRUD_ERRORS.DELETE_FAILED("타임블록"));
      });
    },
    [timeBlocks]
  );

  const carryOver = useCallback(
    async (todoIds: string[], options?: CarryOverOptions) => {
      const todayStr = formatDate(new Date());
      const todosToCarry = incompleteTodos.filter((t) =>
        todoIds.includes(t.id)
      );
      if (todosToCarry.length === 0) return;

      const snapshot = {
        todos: [...todos],
        incompleteTodos: [...incompleteTodos],
        timeBlocks: [...timeBlocks],
      };

      // Optimistic: 미완료 목록에서 제거
      setIncompleteTodos((prev) =>
        prev.filter((t) => !todoIds.includes(t.id))
      );

      // 오늘 날짜로 변경한 투두 준비
      const carriedTodos = todosToCarry.map((t) => ({
        ...t,
        todoDate: todayStr,
      }));

      // 투두 목록에 삽입 + sortOrder 재계산
      const insertAt = options?.insertIndex ?? todos.length;
      setTodos((prev) => {
        const newTodos = [...prev];
        newTodos.splice(insertAt, 0, ...carriedTodos);
        const updated = newTodos.map((t, i) => ({ ...t, sortOrder: i }));

        updated.forEach((t) => {
          const key = `sort-${t.id}`;
          const existing = pendingSync.current.get(key);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            apiUpdateTodo(t.id, { sortOrder: t.sortOrder });
            pendingSync.current.delete(key);
          }, 500);
          pendingSync.current.set(key, timer);
        });

        return updated;
      });

      // Optimistic: 타임블록 생성 (슬롯 지정 시)
      if (options?.timeSlot !== undefined && todosToCarry.length === 1) {
        const carried = carriedTodos[0];
        const tempBlock: TimeBlockWithTodo = {
          id: `temp-${carried.id}`,
          todoId: carried.id,
          userId: carried.userId,
          blockDate: todayStr,
          startSlot: options.timeSlot,
          durationSlots: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          todo: carried,
        };
        setTimeBlocks((prev) => [...prev, tempBlock]);
      }

      // 서버: 이월 처리
      try {
        await apiCarryOverTodos(todoIds, todayStr);
      } catch {
        setTodos(snapshot.todos);
        setIncompleteTodos(snapshot.incompleteTodos);
        setTimeBlocks(snapshot.timeBlocks);
        todoIds.forEach((id) => {
          const key = `sort-${id}`;
          const existing = pendingSync.current.get(key);
          if (existing) {
            clearTimeout(existing);
            pendingSync.current.delete(key);
          }
        });
        toast.error(CRUD_ERRORS.UPDATE_FAILED("이월"));
        return;
      }

      // 서버: 타임블록 생성 (이월 성공 후)
      if (options?.timeSlot !== undefined && todosToCarry.length === 1) {
        const carried = todosToCarry[0];
        try {
          const block = await upsertTimeBlock(carried.id, {
            blockDate: todayStr,
            startSlot: options.timeSlot,
          });
          setTimeBlocks((prev) =>
            prev.map((b) =>
              b.id === `temp-${carried.id}`
                ? { ...block, todo: { ...carried, todoDate: todayStr } }
                : b
            )
          );
        } catch {
          setTimeBlocks((prev) =>
            prev.filter((b) => b.id !== `temp-${carried.id}`)
          );
          toast.error(CRUD_ERRORS.CREATE_FAILED("타임블록"));
        }
      }
    },
    [incompleteTodos, todos, timeBlocks]
  );

  const carryOverAll = useCallback(() => {
    return carryOver(incompleteTodos.map((t) => t.id));
  }, [incompleteTodos, carryOver]);

  const dismissCarryOver = useCallback(() => setIsDismissed(true), []);

  // dismiss 시 빈 배열로 노출
  const visibleIncompleteTodos = isDismissed ? [] : incompleteTodos;

  return (
    <TodoContext.Provider
      value={{
        isOpen,
        open,
        close,
        date,
        setDate,
        todos,
        timeBlocks,
        isLoading,
        addTodo,
        toggleComplete,
        updateColor,
        updateContent,
        deleteTodo: handleDeleteTodo,
        reorderTodos,
        placeBlock,
        moveBlock,
        resizeBlock,
        removeBlock,
        incompleteTodos: visibleIncompleteTodos,
        carryOver,
        carryOverAll,
        dismissCarryOver,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}
