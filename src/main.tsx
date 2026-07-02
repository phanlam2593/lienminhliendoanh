import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwa } from "./lib/pwa";

// Apply persisted theme before render to avoid flash
try {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") document.documentElement.classList.add("dark");
} catch {}

createRoot(document.getElementById("root")!).render(<App />);

registerPwa();
