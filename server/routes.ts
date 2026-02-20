import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0]?.trim();
    if (domain) return `https://${domain}`;
  }
  return `http://localhost:5000`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/auth/me", (req: Request, res: Response) => {
    const oidcUser = (req as any).oidc?.user;
    if (oidcUser) {
      return res.json({
        authenticated: true,
        user: {
          id: oidcUser.sub,
          name: oidcUser.name || oidcUser.given_name || "User",
          email: oidcUser.email || "",
          picture: oidcUser.picture || null,
          firstName: oidcUser.given_name || "",
          lastName: oidcUser.family_name || "",
        },
      });
    }
    return res.json({ authenticated: false, user: null });
  });

  app.get("/api/auth/status", (req: Request, res: Response) => {
    const isAuthenticated = !!(req as any).oidc?.isAuthenticated?.();
    const hasAuthConfig = !!(process.env.REPLIT_AUTH_CLIENT_ID && process.env.REPLIT_AUTH_CLIENT_SECRET);
    return res.json({
      authenticated: isAuthenticated,
      authConfigured: hasAuthConfig,
      loginUrl: hasAuthConfig ? `${getBaseUrl()}/auth/login` : null,
    });
  });

  app.post("/api/auth/simple-login", (req: Request, res: Response) => {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }
    return res.json({
      authenticated: true,
      user: {
        id: `local_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name,
        email: email.toLowerCase(),
        picture: null,
      },
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
