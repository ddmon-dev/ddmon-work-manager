import { ProjectSymbol } from "@/shared/ui/logo";

export function AppSidebarIdentity() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg">
      <ProjectSymbol linkToHome className="text-sm" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium text-sm">Work Manager</span>
        <span className="truncate text-xs text-muted-foreground">
          프리랜서를 위한 외주 관리 시스템
        </span>
      </div>
    </div>
  );
}
