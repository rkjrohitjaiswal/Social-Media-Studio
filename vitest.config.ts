import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "apps/**/*.test.ts", "packages/**/*.test.ts"],
    alias: {
      "@ai-social/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
      "@ai-social/database": path.resolve(__dirname, "./packages/database/src/index.ts"),
    },
  },
});
