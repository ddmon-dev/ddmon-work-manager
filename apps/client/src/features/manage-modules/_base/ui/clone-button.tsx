import { Copy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useManageSheet } from "./manage-sheet";

interface CloneButtonProps {
  id: string;
  children?: React.ReactNode;
}

export function CloneButton({ id, children }: CloneButtonProps) {
  const manageSheet = useManageSheet();

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => manageSheet.open({ id, mode: "clone" })}
    >
      <Copy className="size-3.5" />
      {children ?? "복제"}
    </Button>
  );
}
