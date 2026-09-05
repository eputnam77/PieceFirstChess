import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Component tests need JSX transformed with the automatic runtime. Without
  // this, a `.test.jsx` file fails with "React is not defined" — the plugin is
  // in `vite.config.js` for the app but was never added here.
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@pf": path.resolve(__dirname, "src/pf"),
      "@context": path.resolve(__dirname, "src/lib/context"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@constants": path.resolve(__dirname, "src/lib/constants"),
      "@api": path.resolve(__dirname, "src/services/api"),
      "@query": path.resolve(__dirname, "src/services/query"),
      "@store": path.resolve(__dirname, "src/services/store"),
      "@public": path.resolve(__dirname, "public/images"),
      "@assets": path.resolve(__dirname, "assets"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.js"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      reporter: ["text", "json-summary"],
      exclude: ["e2e/**", "**/*.config.js"],
    },
  },
});
