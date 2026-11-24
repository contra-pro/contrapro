import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const repository = fileURLToPath(new URL("../../../../", import.meta.url));
export default defineConfig({
  root,
  envDir: root,
  envPrefix: "OFFLINE_RENTAL_PREVIEW_",
  server: { host: "127.0.0.1", port: 4179, strictPort: true, hmr: false,
    fs: { strict: true, allow: [root, repository + "apps/web/src/rentals", repository + "apps/web/src/app/globals.css",
      repository + "packages/application/src", repository + "packages/domain/src", repository + "node_modules"] } },
});
