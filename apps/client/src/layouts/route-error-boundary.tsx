import { useRouteError } from "react-router";
import { ErrorStatus } from "@/shared/ui/status-pages/error-status";

export function RouteErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <ErrorStatus fullScreen />;
}
