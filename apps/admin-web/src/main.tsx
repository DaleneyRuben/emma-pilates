import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("The admin web needs a #root element to mount into");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
