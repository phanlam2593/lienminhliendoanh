import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwa } from "./lib/pwa";

// Mặc định app dùng dark theme; chỉ dùng light nếu user đã tự chọn light trước đó.
// Apply persisted theme before render to avoid flash
document.documentElement.classList.add("dark");
try {
  const theme = localStorage.getItem("theme");
  if (theme === "light") document.documentElement.classList.remove("dark");
} catch {}

createRoot(document.getElementById("root")!).render(<App />);

registerPwa();

// Giữ splash động tối thiểu ~1200ms kể từ lúc bắt đầu load — đảm bảo user
// luôn kịp thấy logo + tên app + tagline sau khi OS splash tắt, dù React mount rất nhanh.
const SPLASH_MIN_MS = 1800;
const SPLASH_FADE_MS = 400;
const splashStart = typeof performance !== "undefined" && performance.timeOrigin ? performance.timeOrigin : Date.now();
requestAnimationFrame(() => {
  const splash = document.getElementById("app-splash");
  if (!splash) return;
  const elapsed = Date.now() - splashStart;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), SPLASH_FADE_MS);
  }, wait);
});
