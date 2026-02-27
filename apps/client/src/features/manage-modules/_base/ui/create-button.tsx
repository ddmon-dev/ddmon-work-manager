import { Plus } from "lucide-react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "./manage-sheet";

interface CreateButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function CreateButton({ children, className, ...props }: CreateButtonProps) {
  const manageSheet = useManageSheet();
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={() => manageSheet.open({ mode: "create" })}
      className={className}
      size={isMobile ? "icon-sm" : "default"}
      variant="black"
      rounded="full"
      {...(props as object)}
    >
      {isMobile ? <Plus className="size-6" /> : children ?? "생성"}
    </Button>
  );
}
