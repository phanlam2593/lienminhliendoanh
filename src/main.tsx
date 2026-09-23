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

// Giữ splash động tối thiểu ~1200ms kể từ lúc bắt đầu load — đảm bảo user
// luôn kịp thấy logo + tên app + tagline sau khi OS splash tắt, dù React mount rất nhanh.
const SPLASH_MIN_MS = 1200;
const SPLASH_FADE_MS = 400;
const splashStart = typeof performance !== "undefined" && performance.timeOrigin ? performance.timeOrigin : Date.now();
// Splash chỉ tắt khi app đã SẴN SÀNG THẬT (AuthProvider gọi window.__lomiHideSplash sau khi
// đã biết đăng nhập hay chưa + nạp xong hồ sơ) — trước đây tắt cứng theo giờ nên người dùng
// thấy lộ ra nút Đăng nhập/Đăng ký rồi khung avatar xám ~2s trước khi app load xong.
// Có chốt an toàn 10s để splash không bao giờ bị kẹt nếu mạng quá chậm/lỗi.
let splashHidden = false;
const hideSplash = () => {
  if (splashHidden) return;
  splashHidden = true;
  const splash = document.getElementById("app-splash");
  if (!splash) return;
  const elapsed = Date.now() - splashStart;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), SPLASH_FADE_MS);
  }, wait);
};
(window as any).__lomiHideSplash = hideSplash;
setTimeout(hideSplash, 10000);

createRoot(document.getElementById("root")!).render(<App />);

registerPwa();
