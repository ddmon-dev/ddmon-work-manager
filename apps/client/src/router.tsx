import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/layouts/root-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { ProtectedLayout } from "@/layouts/protected-layout";
import { RouteErrorBoundary } from "@/layouts/route-error-boundary";
import { SignInPage } from "@/pages/auth/sign-in";
import { DashboardPage } from "@/pages/dashboard";
import { ClientsPage } from "@/pages/clients";
import { EstimatesPage } from "@/pages/estimates";
import { ProjectsPage } from "@/pages/projects";
import { SchedulesPage } from "@/pages/schedules";
import { RevenuePage } from "@/pages/revenue";
import { AdminsPage } from "@/pages/admins";
import { NotFoundPage } from "@/pages/not-found";
import { UnauthorizedPage } from "@/pages/unauthorized";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: "/auth/sign-in", element: <SignInPage /> }],
      },
      {
        element: <ProtectedLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/clients", element: <ClientsPage /> },
          { path: "/estimates", element: <EstimatesPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/schedules", element: <SchedulesPage /> },
          { path: "/revenue", element: <RevenuePage /> },
          { path: "/admins", element: <AdminsPage /> },
        ],
      },
      { path: "/unauthorized", element: <UnauthorizedPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
