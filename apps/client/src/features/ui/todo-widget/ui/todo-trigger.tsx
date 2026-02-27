import { ListTodo } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useTodo } from "../context";

export function TodoTrigger() {
  const { open } = useTodo();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={open}
      className="w-full bg-sidebar border dark:bg-sidebar-accent rounded-full hover:text-primary transition-colors"
    >
      <ListTodo />
      <span>할 일 목록</span>
    </Button>
  );
}
