export interface Todo {
  id: string;
  userId: string;
  content: string;
  completed: boolean;
  todoDate: string;
  sortOrder: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlock {
  id: string;
  todoId: string;
  userId: string;
  blockDate: string;
  startSlot: number;
  durationSlots: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoWithTimeBlocks extends Todo {
  timeBlocks: TimeBlock[];
}

export interface TimeBlockWithTodo extends TimeBlock {
  todo: Todo;
}

export const TODO_COLORS = ['slate', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
export type TodoColor = (typeof TODO_COLORS)[number];

export const TODO_COLOR_STYLES: Record<
  TodoColor,
  { dot: string; block: string; text: string }
> = {
  slate:  { dot: 'bg-slate-400',  block: 'bg-slate-500/10 border-slate-500/30',  text: 'text-slate-700 dark:text-slate-300'  },
  red:    { dot: 'bg-red-400',    block: 'bg-red-500/10 border-red-500/30',      text: 'text-red-700 dark:text-red-300'      },
  orange: { dot: 'bg-orange-400', block: 'bg-orange-500/10 border-orange-500/30',text: 'text-orange-700 dark:text-orange-300'},
  yellow: { dot: 'bg-yellow-400', block: 'bg-yellow-500/10 border-yellow-500/30',text: 'text-yellow-700 dark:text-yellow-300'},
  green:  { dot: 'bg-green-400',  block: 'bg-green-500/10 border-green-500/30',  text: 'text-green-700 dark:text-green-300'  },
  blue:   { dot: 'bg-blue-400',   block: 'bg-blue-500/10 border-blue-500/30',    text: 'text-blue-700 dark:text-blue-300'    },
  purple: { dot: 'bg-purple-400', block: 'bg-purple-500/10 border-purple-500/30',text: 'text-purple-700 dark:text-purple-300'},
  pink:   { dot: 'bg-pink-400',   block: 'bg-pink-500/10 border-pink-500/30',    text: 'text-pink-700 dark:text-pink-300'    },
};
