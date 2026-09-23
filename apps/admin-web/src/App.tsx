import { useState } from "react";
import { AdminApp } from "./app/admin-app";
import { createAdminApp } from "./app/create-admin-app";

export function App() {
  const [app] = useState(() => createAdminApp());

  return <AdminApp app={app} />;
}
