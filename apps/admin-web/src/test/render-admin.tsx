import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminApp, createAdminApp } from "../app/admin-app";
import type { Branch } from "../shell/branch/branch-context";

// Renders the whole admin web as main.tsx does, at `path`, so routing, the
// session guard, and the QueryClient's session handling are all real.
export function renderAdmin(
  path: string,
  options: { branches?: readonly Branch[] } = {},
) {
  const app = createAdminApp({
    history: createMemoryHistory({ initialEntries: [path] }),
    branches: options.branches,
  });
  render(<AdminApp app={app} />);
  return { ...app, user: userEvent.setup() };
}
