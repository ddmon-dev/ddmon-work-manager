import { APP_CONFIG } from "@/app.config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/shared/ui/sidebar";
import { AppSidebarIdentity } from "./identity";
import { NavMenu } from "./nav-menu";
import { NavUser } from "./nav-user";
import { ThemeToggle } from "@/shared/ui/theme-switcher";
import { TodoTrigger } from "@/features/ui/todo-widget";
import { navigationConfig } from "./config";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      variant={APP_CONFIG.UI.SIDEBAR.VARIANT}
      {...props}
    >
      <SidebarHeader>
        <AppSidebarIdentity />
      </SidebarHeader>
      <SidebarContent>
        <NavMenu data={navigationConfig.navMain} />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <NavUser />
        <TodoTrigger />
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
