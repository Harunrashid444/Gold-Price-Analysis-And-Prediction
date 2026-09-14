import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts + D3 are most of the bundle and change rarely; keeping them
        // in their own chunk means app edits don't invalidate them.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](recharts|d3-|victory-)/.test(id)) return "charts";
          if (/[\\/]node_modules[\\/](react|react-dom|react-router)/.test(id)) return "react";
        },
      },
    },
  },
});
