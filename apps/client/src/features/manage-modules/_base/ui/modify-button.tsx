import { SquarePen } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "./manage-sheet";

interface ModifyButtonProps {
  id: string;
  children?: React.ReactNode;
}

export function ModifyButton({ id, children }: ModifyButtonProps) {
  const manageSheet = useManageSheet();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => manageSheet.open({ id, mode: "modify" })}
    >
      <SquarePen className="size-3.5" />
      {children ?? "수정"}
    </Button>
  );
}
