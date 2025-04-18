import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

// Track WebSocket connection status
let wsConnectionIssues = false;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add a middleware to serve static files from the static directory
  app.use('/static', express.static(path.join(process.cwd(), 'static')));
  
  // Add a middleware to serve the fallback page for direct access
  app.get('/fallback', (req: Request, res: Response) => {
    const fallbackPath = path.join(process.cwd(), 'static', 'fallback.html');
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
      log('Serving fallback page via /fallback route');
    } else {
      res.status(404).send('Fallback page not found');
    }
  });
  
  // Add a middleware to serve the direct HTML version
  app.get('/direct.html', (req: Request, res: Response) => {
    const directHtmlPath = path.join(process.cwd(), 'direct.html');
    if (fs.existsSync(directHtmlPath)) {
      res.sendFile(directHtmlPath);
      log('Serving direct HTML version via /direct.html route');
    } else {
      res.status(404).send('Direct HTML version not found');
    }
  });

  // Set up WebSocket error detection
  server.on('upgrade', (request, socket, head) => {
    socket.on('error', (err) => {
      log(`WebSocket connection error: ${err.message}`, 'ws');
      wsConnectionIssues = true;
      
      // After multiple WebSocket errors, we'll force a restart with static serving
      if (!process.env.FORCE_PRODUCTION) {
        log('Multiple WebSocket errors detected, restarting in static mode', 'ws');
        // Set environment variable and restart process
        process.env.FORCE_PRODUCTION = 'true';
        
        // Save the error to a file so we can detect it on restart
        try {
          fs.writeFileSync('ws_error.log', `WebSocket error at ${new Date().toISOString()}: ${err.message}`);
        } catch (e) {
          log(`Failed to write ws_error.log: ${e}`, 'error');
        }
      }
    });
  });
  
  // Check for previous WebSocket errors
  try {
    if (fs.existsSync('ws_error.log')) {
      const errorContent = fs.readFileSync('ws_error.log', 'utf8');
      log(`Previous WebSocket errors detected: ${errorContent}`, 'warning');
      wsConnectionIssues = true;
      process.env.FORCE_PRODUCTION = 'true';
    }
  } catch (e) {
    log(`Error checking for previous WebSocket issues: ${e}`, 'error');
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Check for environment variable to force production mode (no WebSockets)
  const forceProduction = process.env.FORCE_PRODUCTION === 'true';
  
  // Check if we should serve the production build or development build
  if (app.get("env") === "development" && !forceProduction && !wsConnectionIssues) {
    try {
      await setupVite(app, server);
      log('Using Vite development server (WebSocket-based HMR)');
    } catch (err) {
      // If Vite setup fails, likely due to WebSocket issues, serve the static build
      log('Vite setup failed, falling back to static build', 'error');
      wsConnectionIssues = true;
      serveStatic(app);
    }
  } else {
    // Either in production mode or WebSocket issues detected
    if (wsConnectionIssues) {
      log('WebSocket issues detected, serving static build', 'warning');
    }
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Server is running in ${app.get("env")} mode`);
    
    // Log some useful information for debugging
    if (process.env.REPL_ID && process.env.REPL_SLUG) {
      log(`Replit environment detected: ${process.env.REPL_SLUG}`);
    }
    
    // Log Solana RPC URL status (but not the actual URL for security)
    if (process.env.SOLANA_RPC_URL) {
      log(`Using custom Solana RPC endpoint`);
    } else {
      log(`Using default Solana RPC endpoint (rate limited)`);
    }
  });
  
  // Handle server errors
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
})();
