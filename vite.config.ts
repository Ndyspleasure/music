import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { vendorAssets } from "./scripts/vite-vendor-assets.ts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vendorAssets()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
  },
});
