import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

const adminApiTarget = process.env.ADMIN_API_TARGET ?? "http://localhost:4141"

export default defineConfig({
  base: "/admin/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 4173,
    proxy: {
      "/admin/api": {
        target: adminApiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    outDir: fileURLToPath(new URL("../../dist/admin", import.meta.url)),
    emptyOutDir: true,
    assetsDir: "assets",
  },
})
