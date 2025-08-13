import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
  server: {
    host: true,     // shorthand for binding to 0.0.0.0
    port: 5173,
    strictPort: true,
    // Only needed if you're using custom hostnames or are worried about rebinding attacks
    // allowedHosts: ["localhost", "127.0.0.1", "mydev.local"],
  },
  preview: {
    host: true,     // also binds preview server to 0.0.0.0
    port: 5173,
    strictPort: true,
  },
});
