import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 1421 — 1420 gehört SMarTrBrowser (parallele Entwicklung möglich).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
});
