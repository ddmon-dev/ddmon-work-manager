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
import { ProjectSchedulesPage } from "@/pages/project-schedules";
import { SchedulesPage } from "@/pages/schedules";
import { FinancialPage } from "@/pages/financial";
import { PartnersPage } from "@/pages/partners";
import { ClientEnvironmentsPage } from "@/pages/client-environments";
import { AdminsPage } from "@/pages/admins";
import { LibraryPage } from "@/pages/library";
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
        children: [
          {
            errorElement: <RouteErrorBoundary />,
            children: [
              { path: "/", element: <DashboardPage /> },
              { path: "/clients", element: <ClientsPage /> },
              { path: "/estimates", element: <EstimatesPage /> },
              { path: "/projects", element: <ProjectsPage /> },
              { path: "/project-schedules", element: <ProjectSchedulesPage /> },
              { path: "/schedules", element: <SchedulesPage /> },
              { path: "/partners", element: <PartnersPage /> },
              { path: "/client-environments", element: <ClientEnvironmentsPage /> },
              { path: "/financial", element: <FinancialPage /> },
              { path: "/admins", element: <AdminsPage /> },
              { path: "/library", element: <LibraryPage /> },
              { path: "/unauthorized", element: <UnauthorizedPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
