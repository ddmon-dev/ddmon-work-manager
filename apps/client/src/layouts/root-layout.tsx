import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { ThemeContext, useThemeProvider } from "@/shared/hooks/use-theme";

export function RootLayout() {
  const themeValue = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeValue}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </ThemeContext.Provider>
  );
}
