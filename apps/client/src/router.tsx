import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/layouts/root-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { ProtectedLayout } from "@/layouts/protected-layout";
import { RouteErrorBoundary } from "@/layouts/route-error-boundary";
import { SignInPage } from "@/pages/auth/sign-in";
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
              { path: "/", lazy: async () => ({ Component: (await import("@/pages/dashboard")).DashboardPage }) },
              { path: "/clients", lazy: async () => ({ Component: (await import("@/pages/clients")).ClientsPage }) },
              { path: "/estimates", lazy: async () => ({ Component: (await import("@/pages/estimates")).EstimatesPage }) },
              { path: "/projects", lazy: async () => ({ Component: (await import("@/pages/projects")).ProjectsPage }) },
              { path: "/project-schedules", lazy: async () => ({ Component: (await import("@/pages/project-schedules")).ProjectSchedulesPage }) },
              { path: "/schedules", lazy: async () => ({ Component: (await import("@/pages/schedules")).SchedulesPage }) },
              { path: "/partners", lazy: async () => ({ Component: (await import("@/pages/partners")).PartnersPage }) },
              { path: "/client-environments", lazy: async () => ({ Component: (await import("@/pages/client-environments")).ClientEnvironmentsPage }) },
              { path: "/financial", lazy: async () => ({ Component: (await import("@/pages/financial")).FinancialPage }) },
              { path: "/admins", lazy: async () => ({ Component: (await import("@/pages/admins")).AdminsPage }) },
              { path: "/library", lazy: async () => ({ Component: (await import("@/pages/library")).LibraryPage }) },
              { path: "/unauthorized", element: <UnauthorizedPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
