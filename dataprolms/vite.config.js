import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const app_dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, app_dir, "");
  const api_url = env.VITE_API_URL || "http://localhost:5000";


  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@admin_screens": path.resolve(app_dir, "../server/utils/admin_screens.js")
      }
    },
    optimizeDeps: {
      include: ["react-pdf", "pdfjs-dist", "three", "@met4citizen/talkinghead"]
    },
    server: {
      allowedHosts: [".trycloudflare.com"],
      fs: {
        allow: [app_dir, path.resolve(app_dir, "../server/utils")]
      },
      proxy: {
        "/api": api_url
      }
    }
  };
});
