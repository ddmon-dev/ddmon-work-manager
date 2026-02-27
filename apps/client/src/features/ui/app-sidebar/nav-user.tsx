import { APP_CONFIG } from "@/app.config";
import { ChevronsUpDown, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui/sidebar";
import { Skeleton } from "@/shared/ui/skeleton";
import { useAuth, type AuthState } from "@/features/auth/hooks/use-auth";
import { authClient } from "@/features/auth/lib/auth-client";

export function NavUser() {
  const { isMobile } = useSidebar();
  const auth = useAuth();

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = APP_CONFIG.AUTH.PATHS.SIGN_IN;
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserInfo auth={auth} />
              <ChevronsUpDown className="ml-auto size-4 group-data-[state=open]:text-primary transition-colors" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 pl-2 font-normal">
              <UserInfo auth={auth} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function UserInfo({ auth }: { auth: AuthState }) {
  const user = auth.status === "authenticated" ? auth.user : undefined;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const role =
    auth.status === "authenticated" && auth.isSuperAdmin
      ? APP_CONFIG.AUTH.ADMIN_LABELS.SUPER_ADMIN
      : APP_CONFIG.AUTH.ADMIN_LABELS.ADMIN;

  return (
    <div className="flex items-center gap-2 py-1.5 text-left text-sm">
      <Avatar className="h-8 w-8 rounded-full">
        <AvatarFallback className="rounded-full bg-foreground/80 text-background dark:bg-primary-light dark:text-primary-light-foreground font-semibold text-lg transition-colors">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="grid gap-1 flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">
          {!user ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            `${user.name} (${user.username ?? user.id})`
          )}
        </span>
        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {!user ? (
            <Skeleton className="h-2.5 w-42" />
          ) : (
            <>
              <Shield className="size-3" />
              <span className="text-xs truncate leading-[1em]">{role}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
