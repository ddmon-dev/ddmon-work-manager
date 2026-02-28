import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router";
import { queryClient } from "@/shared/lib/query-client";
import { DialogProvider } from "@/shared/ui/app-dialog";
import { router } from "./router";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </DialogProvider>
    </QueryClientProvider>
  );
}
