import { useManageSheet } from "./manage-sheet";
import { ErrorStatus } from "@/shared/ui/status-pages";

interface ManageSheetErrorProps {
  onRetry?: () => void;
}

export function ManageSheetError({ onRetry }: ManageSheetErrorProps) {
  const manageSheet = useManageSheet();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      manageSheet.close();
    }
  };

  return <ErrorStatus onRetry={handleRetry} size="sm" />;
}
