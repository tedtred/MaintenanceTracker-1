import { type Express } from "express";
import { type Server } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import viteConfig from "../vite.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupDevServer(app: Express, server: Server) {
  console.log("[Debug] Setting up Vite development server");
  console.log("[Debug] Current working directory:", process.cwd());
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: {
        server,
        port: 443,
        clientPort: 443,
        protocol: 'wss'
      },
      host: '0.0.0.0',
      port: 5000,
      strictPort: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      watch: {
        usePolling: true,
      },
      allowedHosts: true
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}