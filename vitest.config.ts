import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        // The @wordpress/* ESM builds use bare JSON imports that Node's native
        // loader rejects. Inlining routes them through esbuild, which handles
        // JSON imports, so the validation harness can load them under jsdom.
        inline: [/@wordpress\//],
      },
    },
  },
});
