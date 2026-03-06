import { Copy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "./manage-sheet";

interface DuplicateButtonProps {
  id: string;
  children?: React.ReactNode;
}

export function DuplicateButton({ id, children }: DuplicateButtonProps) {
  const manageSheet = useManageSheet();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => manageSheet.open({ id, mode: "duplicate" })}
    >
      <Copy className="size-3.5" />
      {children ?? "복제"}
    </Button>
  );
}
