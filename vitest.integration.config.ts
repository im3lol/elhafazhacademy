import { defineConfig } from "vitest/config";
import path from "node:path";

// اختبارات التكامل — تُشغَّل بـ `npm run test:db` وتتطلّب TEST_DATABASE_URL
// (قاعدة اختبار، لا الإنتاج — الحاجز في tests/setup.ts).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
  },
});
