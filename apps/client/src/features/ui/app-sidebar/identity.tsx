import { ProjectSymbol } from "@/shared/ui/logo";
import { APP_CONFIG } from "@/app.config";

export function AppSidebarIdentity() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg">
      <ProjectSymbol linkToHome className="text-sm" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium text-sm">{APP_CONFIG.META.TITLE}</span>
        <span className="truncate text-xs text-muted-foreground">
          {APP_CONFIG.META.DESCRIPTION}
        </span>
      </div>
    </div>
  );
}
