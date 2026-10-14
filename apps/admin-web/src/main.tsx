import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { startErrorReporting } from "./monitoring/error-reporting";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("The admin web needs a #root element to mount into");
}

const errorHandlers = startErrorReporting({
  dsn: import.meta.env.VITE_ERROR_REPORTING_DSN,
  environment: import.meta.env.VITE_VERCEL_ENV ?? import.meta.env.MODE,
  release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
});

createRoot(rootElement, errorHandlers).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
