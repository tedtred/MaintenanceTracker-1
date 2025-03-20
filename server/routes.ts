import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWorkOrderSchema, insertAssetSchema, insertMaintenanceScheduleSchema, insertMaintenanceCompletionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { upload, handleFileUpload, processCSVImport, generateCSVExport } from "./services/file-storage";
import path from "path";
import express from "express";
import fs from 'fs'; //Import fs module

function handleZodError(error: ZodError) {
  const errors: Record<string, string[]> = {};
  for (const issue of error.errors) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  return errors;
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("[Debug] Starting route registration");
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: handleZodError(err),
      });
    }
    res.status(500).json({
      message: err.message || "An unexpected error occurred",
    });
  });

  // File upload endpoint
  app.post("/api/work-orders/:id/attachments", upload.single('file'), async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workOrderId = parseInt(req.params.id);
      const fileData = await handleFileUpload(req.file);
      const attachment = await storage.createWorkOrderAttachment({
        ...fileData,
        workOrderId,
      });

      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  });

  // Work Orders
  app.get("/api/work-orders", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Check and archive completed work orders before returning the list
      await storage.checkAndArchiveCompletedWorkOrders();
      const workOrders = await storage.getWorkOrders();
      res.json(workOrders);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/work-orders", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertWorkOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      const workOrder = await storage.createWorkOrder(parsed.data);
      res.status(201).json(workOrder);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/work-orders/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const workOrder = await storage.updateWorkOrder(id, req.body);
      res.json(workOrder);
    } catch (error) {
      next(error);
    }
  });

  // Add the DELETE route for work orders
  app.delete("/api/work-orders/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWorkOrder(id);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  // Fix the work order route parameter parsing
  app.get("/api/work-orders/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid work order ID" });
      }
      const workOrder = await storage.getWorkOrder(id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      res.json(workOrder);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/work-orders/:id/attachments", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const workOrderId = parseInt(req.params.id);
      if (isNaN(workOrderId)) {
        return res.status(400).json({ message: "Invalid work order ID" });
      }
      const attachments = await storage.getWorkOrderAttachments(workOrderId);
      res.json(attachments);
    } catch (error) {
      next(error);
    }
  });


  // Assets
  app.get("/api/assets", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/assets", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      const asset = await storage.createAsset(parsed.data);
      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/assets/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.updateAsset(id, req.body);
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  // Import route for assets
  app.post("/api/assets/import", upload.single('file'), async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const importResult = await processCSVImport(req.file.path);

      // If the import was successful, create the assets and their schedules
      if (importResult.success) {
        for (const assetData of importResult.importedAssets) {
          try {
            // Create the asset first
            const asset = await storage.createAsset(assetData);

            // Find and create associated maintenance schedules
            const assetSchedules = importResult.importedSchedules;

            // Create maintenance schedules for this asset
            for (const scheduleData of assetSchedules) {
              await storage.createMaintenanceSchedule({
                ...scheduleData,
                assetId: asset.id
              });
            }
          } catch (error) {
            console.error('Error creating asset or schedules:', error);
            importResult.errors.push({
              row: 0,
              error: `Failed to create asset: ${error.message}`,
              data: assetData
            });
          }
        }
      }

      // Delete the temporary file
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });

      res.json(importResult);
    } catch (error) {
      // Delete the temporary file on error
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }
      next(error);
    }
  });

  // Add export route
  app.get("/api/assets/export", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const assets = await storage.getAssets();
      const schedules = await storage.getMaintenanceSchedules();

      const csvContent = generateCSVExport(assets, schedules);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=assets-export.csv');
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  });

  // Maintenance Schedules
  app.get("/api/maintenance-schedules", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
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
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance-schedules", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertMaintenanceScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      const schedule = await storage.createMaintenanceSchedule(parsed.data);
      res.status(201).json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/maintenance-schedules/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const schedule = await storage.updateMaintenanceSchedule(id, req.body);
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance-schedules/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaintenanceSchedule(id);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  // Maintenance Completions
  app.get("/api/maintenance-completions", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const completions = await storage.getMaintenanceCompletions();
      res.json(completions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance-completions", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertMaintenanceCompletionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      const completion = await storage.createMaintenanceCompletion(parsed.data);
      res.status(201).json(completion);
    } catch (error) {
      next(error);
    }
  });

  // Add the DELETE route for assets
  app.delete("/api/assets/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAsset(id);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/settings", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  console.log("[Debug] HTTP server created");
  return httpServer;
}