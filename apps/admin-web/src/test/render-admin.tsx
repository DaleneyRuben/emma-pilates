import { createMemoryHistory } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminApp } from "../app/admin-app";
import { createAdminApp } from "../app/create-admin-app";

// Renders the whole admin web as main.tsx does, at `path`, so routing, the
// session guard, and the QueryClient's session handling are all real.
export function renderAdmin(path: string) {
  const app = createAdminApp({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<AdminApp app={app} />);
  return { ...app, user: userEvent.setup() };
}
