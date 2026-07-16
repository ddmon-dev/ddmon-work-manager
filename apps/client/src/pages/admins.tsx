import { Navigate } from "react-router";
import { AdminsModule } from "@/features/manage-modules/admins";
import { IS_DEMO } from "@/shared/lib/demo";

export function AdminsPage() {
  if (IS_DEMO) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <AdminsModule />;
}
