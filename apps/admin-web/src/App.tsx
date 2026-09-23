import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { createAdminQueryClient } from "./api/query-client";
import { createAdminRouter } from "./app/router";

export function App() {
  const [queryClient] = useState(createAdminQueryClient);
  const [router] = useState(() => createAdminRouter());

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
