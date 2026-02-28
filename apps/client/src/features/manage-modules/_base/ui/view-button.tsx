import { Eye } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "./manage-sheet";

interface ViewButtonProps {
  id: string;
  children?: React.ReactNode;
}

export function ViewButton({ id, children }: ViewButtonProps) {
  const manageSheet = useManageSheet();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => manageSheet.open({ id, mode: "view" })}
    >
      <Eye className="size-3.5" />
      {children ?? "상세보기"}
    </Button>
  );
}
