import { Lightbulb } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useMindnote } from "../context";

export function MindnoteTrigger() {
  const { open } = useMindnote();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={open}
      className="w-full bg-sidebar border dark:bg-sidebar-accent rounded-full hover:text-primary transition-colors"
    >
      <Lightbulb />
      <span>마인드노트</span>
    </Button>
  );
}
