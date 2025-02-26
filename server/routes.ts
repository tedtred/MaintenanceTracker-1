import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWorkOrderSchema, insertAssetSchema } from "@shared/schema";
import { insertMaintenanceScheduleSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Work Orders
  app.get("/api/work-orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const workOrders = await storage.getWorkOrders();
    res.json(workOrders);
  });

  app.post("/api/work-orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertWorkOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const workOrder = await storage.createWorkOrder(parsed.data);
    res.status(201).json(workOrder);
  });

  app.patch("/api/work-orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const workOrder = await storage.updateWorkOrder(id, req.body);
    res.json(workOrder);
  });

  // Assets
  app.get("/api/assets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const assets = await storage.getAssets();
    res.json(assets);
  });

  app.post("/api/assets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const asset = await storage.createAsset(parsed.data);
    res.status(201).json(asset);
  });

  app.patch("/api/assets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const asset = await storage.updateAsset(id, req.body);
    res.json(asset);
  });

  // Maintenance Schedules
  app.get("/api/maintenance-schedules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { start, end } = req.query;

    let schedules;
    if (start && end) {
      schedules = await storage.getMaintenanceSchedulesByDateRange(
        new Date(start as string),
        new Date(end as string)
      );
    } else {
      schedules = await storage.getMaintenanceSchedules();
    }
    res.json(schedules);
  });

  app.post("/api/maintenance-schedules", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertMaintenanceScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const schedule = await storage.createMaintenanceSchedule(parsed.data);
    res.status(201).json(schedule);
  });

  app.patch("/api/maintenance-schedules/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    const schedule = await storage.updateMaintenanceSchedule(id, req.body);
    res.json(schedule);
  });

  const httpServer = createServer(app);
  return httpServer;
}