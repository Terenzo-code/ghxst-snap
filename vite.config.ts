import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router"))
            return "vendor";
          if (id.includes("appwrite")) return "appwrite";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform"))
            return "forms";
          return "vendor-misc";
        },
      },
    },
  },
});
