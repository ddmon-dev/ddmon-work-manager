import { ListTodo, Lightbulb, StickyNote, Calculator } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { useTodo } from "@/features/ui/todo-widget";
import { useMindnote } from "@/features/ui/mindnote-widget";
import { useMemoWidget } from "@/features/ui/memo-widget";
import { useCalculator } from "@/features/ui/calculator-widget";

export function WidgetTriggerGroup() {
  const { open: openTodo } = useTodo();
  const { open: openMindnote } = useMindnote();
  const { open: openMemo } = useMemoWidget();
  const { toggle: toggleCalculator, triggerRef } = useCalculator();

  return (
    <ButtonGroup className="flex items-center gap-0 w-full divide-x bg-sidebar border dark:bg-sidebar-accent transition-colors rounded-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={openTodo}
        className="flex-1 rounded-l-full hover:text-primary bg-transparent! transition-colors"
      >
        <ListTodo />
        <span>할 일</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={openMindnote}
        className="flex-1 hover:text-primary bg-transparent! transition-colors"
      >
        <Lightbulb />
        <span>노트</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={openMemo}
        className="flex-1 hover:text-primary bg-transparent! transition-colors"
      >
        <StickyNote />
        <span>메모</span>
      </Button>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={toggleCalculator}
        className="flex-1 rounded-r-full hover:text-primary bg-transparent! transition-colors"
      >
        <Calculator />
        <span>계산</span>
      </Button>
    </ButtonGroup>
  );
}
