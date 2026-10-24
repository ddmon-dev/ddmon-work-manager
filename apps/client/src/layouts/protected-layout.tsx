import { Navigate, Outlet, useNavigation, useLocation } from "react-router";
import { SidebarProvider, SidebarInset } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/features/ui/app-sidebar";
import { TodoProvider, TodoSheet } from "@/features/ui/todo-widget";
import { MemoProvider, MemoSheet } from "@/features/ui/memo-widget";
import { CalculatorProvider, CalculatorPopup } from "@/features/ui/calculator-widget";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { IdleLogoutProvider } from "@/features/auth/ui/idle-logout-provider";
import { useAtLeastLoading } from "@/shared/utils/delays";
import { AppLayoutSkeleton } from "@/shared/ui/skeletons/app-layout-skeleton";
import { ListSkeleton } from "@/shared/ui/skeletons/list-skeleton";
import { APP_CONFIG } from "@/app.config";

export function ProtectedLayout() {
  const navigation = useNavigation();
  const location = useLocation();
  const isChangingPage = navigation.state !== "idle" && navigation.location?.pathname !== location.pathname;
  const { status, isLoading } = useAuth();
  const showSkeleton = useAtLeastLoading(isLoading);

  if (showSkeleton) {
    return <AppLayoutSkeleton />;
  }

  if (status === "unauthenticated") {
    return <Navigate to={APP_CONFIG.AUTH.PATHS.SIGN_IN} replace />;
  }

  return (
    <IdleLogoutProvider>
      <CalculatorProvider>
        <TodoProvider>
          <MemoProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                {isChangingPage ? <div className="flex flex-1 flex-col p-4 md:p-8"><ListSkeleton /></div> : <Outlet />}
              </SidebarInset>
            </SidebarProvider>
            <TodoSheet />
            <MemoSheet />
          </MemoProvider>
        </TodoProvider>
        <CalculatorPopup />
      </CalculatorProvider>
    </IdleLogoutProvider>
  );
}
