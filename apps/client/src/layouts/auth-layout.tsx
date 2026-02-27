import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function AuthLayout() {
  const { status, isLoading } = useAuth();

  if (isLoading) return null;

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
