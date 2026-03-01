import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Building2, Users } from "lucide-react";
import { APP_CONFIG } from "@/app.config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/shared/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { BusinessInfoDialog } from "@/features/settings/business-info-dialog";
import { AppSidebarIdentity } from "./identity";
import { NavMenu } from "./nav-menu";
import { NavUser } from "./nav-user";
import { ThemeToggle } from "@/shared/ui/theme-switcher";
import { TodoTrigger } from "@/features/ui/todo-widget";
import { navigationConfig } from "./config";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isSuperAdmin } = useAuth();
  const [bizInfoOpen, setBizInfoOpen] = useState(false);

  return (
    <>
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

          {isSuperAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>설정</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/admins">
                      <Users />
                      <span>관리자 계정 관리</span>
                      <ArrowRight className="ml-auto" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setBizInfoOpen(true)}>
                    <Building2 />
                    <span>사업자 정보</span>
                    <ArrowRight className="ml-auto" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="gap-2">
          <NavUser />
          <TodoTrigger />
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>

      <BusinessInfoDialog open={bizInfoOpen} onOpenChange={setBizInfoOpen} />
    </>
  );
}
