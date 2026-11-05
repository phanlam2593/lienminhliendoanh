import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Vài test nạp cả kho dữ liệu (1500 thẻ y khoa, ~1500 luật tiếng Việt) qua một chunk lớn
    // → lần nạp đầu tiên lâu hơn mặc định 5s, nhất là khi chạy song song với 57 file khác.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
