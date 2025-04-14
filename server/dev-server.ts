import { type Express } from "express";
import { type Server } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import viteConfig from "../vite.config";
import { isReplit } from "./utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupDevServer(app: Express, server: Server) {
  console.log("Setting up development server with Vite...");
  
  // Configure HMR based on the environment
  let hmrConfig: any = {};
  
  if (isReplit) {
    console.log("Configuring HMR for Replit environment");
    // For Replit, disable HMR since it's causing connection issues
    // This will make the app more stable even though hot reloading won't work
    hmrConfig = false;
  } else {
    // Default HMR configuration for local development
    hmrConfig = {
      server,
      port: 443,
      clientPort: 443,
      protocol: 'wss'
    };
  }
  
  console.log("HMR Configuration:", hmrConfig === false ? "Disabled" : JSON.stringify(hmrConfig, null, 2));
  
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: hmrConfig,
      host: true,
      strictPort: false,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      cors: true,
      allowedHosts: true,
    },
    clearScreen: false, // Prevent clearing the console
    appType: "custom",
    logLevel: "info"
  });

  // Define a health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Use Vite's middleware
  app.use(vite.middlewares);

  // Handle all non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      console.log(`Serving index.html for path: ${url}`);
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Add a cache busting parameter
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      // Add a base tag to ensure proper path resolution
      template = template.replace(
        '<head>',
        `<head>
        <base href="/" />
        <title>CMMS Application</title>`
      );
      
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error rendering index.html:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}