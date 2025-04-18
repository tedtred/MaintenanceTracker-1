import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRole } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      // Check if user is approved
      if (!user.approved && user.role !== UserRole.ADMIN) {
        return done(null, false, { message: "Account pending approval" });
      }
      return done(null, user);
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Registration route - sets default role and requires approval
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      username: req.body.username,
      password: await hashPassword(req.body.password),
      role: UserRole.TECHNICIAN, // Default role
      approved: false, // Requires approval
      pagePermissions: "[]", // No page permissions by default
    });

    res.status(201).json({ 
      message: "Registration successful. Your account is pending admin approval.",
      username: user.username
    });
  });

  // Admin endpoints for user management
  app.get("/api/admin/pending-users", isAdmin, async (_req, res) => {
    try {
      const users = await storage.getPendingUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.patch("/api/admin/users/:id/approve", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
      const updatedUser = await storage.approveUser(userId);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  // Delete user endpoint
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (req.user?.id === userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    try {
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Existing routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid credentials" 
        });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Admin routes for user management
  app.get("/api/admin/users", isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Add endpoint for updating page permissions
  app.patch("/api/admin/users/:id/permissions", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: "Permissions must be an array of page IDs" });
    }

    try {
      const updatedUser = await storage.updateUserPagePermissions(userId, permissions);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });
  
  // Add endpoint for updating user's default landing page
  app.patch("/api/admin/users/:id/default-landing-page", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { defaultLandingPage } = req.body;

    if (typeof defaultLandingPage !== 'string') {
      return res.status(400).json({ message: "Default landing page must be a string" });
    }

    try {
      // We need to add this method to the storage interface
      const updatedUser = await storage.updateUserDefaultLandingPage(userId, defaultLandingPage);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user default landing page" });
    }
  });
}