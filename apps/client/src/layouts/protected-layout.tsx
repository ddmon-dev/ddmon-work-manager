import { Navigate, Outlet } from "react-router";
import { SidebarProvider, SidebarInset } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/features/ui/app-sidebar";
import { TodoProvider, TodoSheet } from "@/features/ui/todo-widget";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Spinner } from "@/shared/ui/spinner";
import { APP_CONFIG } from "@/app.config";

export function ProtectedLayout() {
  const { status, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to={APP_CONFIG.AUTH.PATHS.SIGN_IN} replace />;
  }

  return (
    <TodoProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <TodoSheet />
    </TodoProvider>
  );
}
