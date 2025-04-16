import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertWorkOrderSchema, insertAssetSchema, InsertAsset,
  insertMaintenanceScheduleSchema, insertMaintenanceCompletionSchema, 
  insertProblemButtonSchema, insertProblemEventSchema,
  WorkOrderStatus, WorkOrderPriority
} from "@shared/schema";
import { ZodError } from "zod";
import { upload, handleFileUpload, processCSVImport, generateCSVExport } from "./services/file-storage";
import { setupEnvironmentRoutes } from "./routes/environment";
import path from "path";
import express from "express";
import fs from 'fs'; //Import fs module
import cors from 'cors';

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
  // Configure CORS with dynamic origin checking
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      // or any origin when in development or when ALLOW_ORIGIN is set to *
      if (!origin || process.env.ALLOW_ORIGIN === '*') {
        return callback(null, true);
      }
      
      // Check if the origin is in the allowed list
      // This allows explicit IP addresses like 192.168.0.122 to work
      const allowedOrigins = [
        'http://localhost:5000',
        'http://localhost:3000',
        process.env.HOST ? `http://${process.env.HOST}:${process.env.PORT || 5000}` : undefined,
      ].filter(Boolean);
      
      // If IS_DOCKER is true, be more permissive with origins to support IP-based access
      const isDocker = process.env.IS_DOCKER === 'true';
      if (isDocker) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // Add a health check endpoint with detailed environment information
  app.get('/api/health', (req, res) => {
    const isDocker = process.env.IS_DOCKER === 'true' || 
                     process.env.DOCKER_ENV === 'true' || 
                     process.env.RUNNING_IN_DOCKER === 'true';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        is_docker: isDocker,
        server_port: process.env.PORT || '5000',
        server_host: process.env.HOST || '0.0.0.0'
      }
    });
  });
  setupAuth(app);
  setupEnvironmentRoutes(app);

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
      
      // Process date fields to ensure they're proper Date objects
      const updates = { ...req.body };
      
      // Convert string dates to Date objects
      if (updates.dueDate && typeof updates.dueDate === 'string') {
        updates.dueDate = new Date(updates.dueDate);
      }
      if (updates.completedDate && typeof updates.completedDate === 'string') {
        updates.completedDate = new Date(updates.completedDate);
      }
      if (updates.reportedDate && typeof updates.reportedDate === 'string') {
        updates.reportedDate = new Date(updates.reportedDate);
      }
      
      const workOrder = await storage.updateWorkOrder(id, updates);
      res.json(workOrder);
    } catch (error) {
      console.error('Error updating work order:', error);
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
      // Check for Docker environment
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                              || process.env.RUNNING_IN_DOCKER === 'true';
      
      console.log(`Asset creation - Docker environment: ${isRunningInDocker}`);
      console.log('Request body:', JSON.stringify(req.body));
      
      if (isRunningInDocker) {
        // For Docker, use custom validation that's more forgiving
        // Only check essential fields (name, location, status, category) - allow empty description
        if (!req.body.name || !req.body.location || !req.body.status || !req.body.category) {
          return res.status(400).json({
            message: "Validation error",
            errors: {
              name: !req.body.name ? "Name is required" : undefined,
              location: !req.body.location ? "Location is required" : undefined, 
              status: !req.body.status ? "Status is required" : undefined,
              category: !req.body.category ? "Category is required" : undefined
            }
          });
        }
        
        // Prepare sanitized data with correct type assertion
        const sanitizedData: Partial<InsertAsset> = {
          name: req.body.name,
          description: req.body.description || '', // Use empty string if description is missing
          location: req.body.location,
          status: req.body.status,
          category: req.body.category,
          // Add null values for required fields in the database schema
          commissionedDate: null,
          lastMaintenance: null,
          assetTag: req.body.assetTag || null,
          modelNumber: req.body.modelNumber || null,
          serialNumber: req.body.serialNumber || null,
          manufacturer: req.body.manufacturer || null
        };
        
        console.log('Bypassing Zod validation for Docker environment, using sanitized data:', sanitizedData);
        
        const asset = await storage.createAsset(sanitizedData);
        return res.status(201).json(asset);
      } else {
        // For regular environments, use Zod schema validation
        const parsed = insertAssetSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Validation error",
            errors: handleZodError(parsed.error),
          });
        }
        const asset = await storage.createAsset(parsed.data);
        return res.status(201).json(asset);
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      next(error);
    }
  });

  app.patch("/api/assets/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      
      // Process date fields to ensure they're proper Date objects
      const updates = { ...req.body };
      
      // Convert string dates to Date objects
      if (updates.commissionedDate && typeof updates.commissionedDate === 'string') {
        updates.commissionedDate = new Date(updates.commissionedDate);
      }
      if (updates.lastMaintenance && typeof updates.lastMaintenance === 'string') {
        updates.lastMaintenance = new Date(updates.lastMaintenance);
      }
      
      const asset = await storage.updateAsset(id, updates);
      res.json(asset);
    } catch (error) {
      console.error('Error updating asset:', error);
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
      
      // Process date fields to ensure they're proper Date objects
      const updates = { ...req.body };
      
      // Convert string dates to Date objects
      if (updates.lastCompletedDate && typeof updates.lastCompletedDate === 'string') {
        updates.lastCompletedDate = new Date(updates.lastCompletedDate);
      }
      if (updates.nextDueDate && typeof updates.nextDueDate === 'string') {
        updates.nextDueDate = new Date(updates.nextDueDate);
      }
      
      const schedule = await storage.updateMaintenanceSchedule(id, updates);
      res.json(schedule);
    } catch (error) {
      console.error('Error updating maintenance schedule:', error);
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

  // Add route for updating asset status
  app.patch("/api/assets/:id/status", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { assetId, status } = req.body;
      
      // Basic validation
      if (!assetId || !status) {
        return res.status(400).json({ message: "Asset ID and status are required" });
      }
      
      // Ensure status is one of the allowed values
      const validStatuses = ["OPERATIONAL", "MAINTENANCE", "OFFLINE", "DECOMMISSIONED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      const asset = await storage.updateAsset(Number(assetId), { status });
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  // Problem tracking endpoints
  
  // Problem buttons
  app.get("/api/problem-buttons", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const buttons = await storage.getProblemButtons();
      res.json(buttons);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/problem-buttons/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const button = await storage.getProblemButton(id);
      if (!button) {
        return res.status(404).json({ message: "Button not found" });
      }
      res.json(button);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/problem-buttons", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const parsed = insertProblemButtonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      const button = await storage.createProblemButton(parsed.data);
      res.status(201).json(button);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/problem-buttons/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const button = await storage.updateProblemButton(id, req.body);
      res.json(button);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/problem-buttons/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProblemButton(id);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });
  
  // Problem events
  app.get("/api/problem-events", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { start, end } = req.query;
      
      let events;
      if (start && end) {
        events = await storage.getProblemEventsByDate(
          new Date(start as string),
          new Date(end as string)
        );
      } else {
        events = await storage.getProblemEvents();
      }
      res.json(events);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/problem-events/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getProblemEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/problem-events", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Get the current user's ID from the session
      const userId = req.user!.id;
      
      // Debug info for troubleshooting
      console.log("Problem event request body:", JSON.stringify(req.body));
      
      // Extract work order creation data if present
      const { 
        createWorkOrder, 
        workOrderTitle, 
        workOrderDescription, 
        workOrderPriority,
        defaultAssetId,
        notifyMaintenance,
        ...problemData 
      } = req.body;
      
      // Combine request body with user ID for problem event and add timestamp if missing
      const eventData = { 
        ...problemData, 
        userId,
        // Add timestamp if not provided (required by schema)
        timestamp: problemData.timestamp || new Date() 
      };
      
      // Debug info for troubleshooting
      console.log("Problem event data before validation:", JSON.stringify(eventData));
      
      const parsed = insertProblemEventSchema.safeParse(eventData);
      if (!parsed.success) {
        // Log the detailed validation error
        console.error("Validation error details:", JSON.stringify(parsed.error.errors));
        
        return res.status(400).json({
          message: "Validation error",
          errors: handleZodError(parsed.error),
        });
      }
      
      // First create the problem event
      const event = await storage.createProblemEvent(parsed.data);
      
      // If createWorkOrder flag is set, create a work order
      if (createWorkOrder) {
        try {
          // Get the button to access template data
          const button = await storage.getProblemButton(event.buttonId);
          
          if (!button) {
            console.error(`Button ${event.buttonId} not found for work order creation`);
          } else {
            console.log('Creating work order from button template:', { 
              buttonId: button.id, 
              createWorkOrder: button.createWorkOrder,
              template: button.workOrderTitle
            });
            
            // Process template variables in title and description
            let title = workOrderTitle || button.workOrderTitle || `Problem: ${button.label}`;
            let description = workOrderDescription || button.workOrderDescription || '';
            
            // Replace template variables
            const asset = event.assetId ? await storage.getAsset(event.assetId) : null;
            if (asset) {
              title = title.replace(/\[asset\]/g, asset.name);
              description = description.replace(/\[asset\]/g, asset.name);
            }
            
            if (event.locationName) {
              description = description.replace(/\[location\]/g, event.locationName);
            }
            
            if (event.notes) {
              description = description.replace(/\[notes\]/g, event.notes);
            }
            
            // Create workorder with problemDetails
            let problemDetails = "";
            
            // Collect problem details from various fields
            if (event.problemDetails) {
              problemDetails = event.problemDetails;
            } else if (event.notes) {
              problemDetails = event.notes;
            }
            
            // Create the work order
            const workOrder = await storage.createWorkOrder({
              title,
              description,
              status: WorkOrderStatus.OPEN,
              priority: workOrderPriority || button.workOrderPriority || WorkOrderPriority.HIGH,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default due date: tomorrow
              reportedDate: new Date(), // Add reported date to fix validation error
              assetId: event.assetId || defaultAssetId || button.defaultAssetId,
              assignedTo: button.defaultAssignedTo,
              // Add problem details to work order
              problemDetails: problemDetails,
              // No need to manually set these fields as they have defaults in the schema
              completedDate: null,
              affectsAssetStatus: false,
              createdBy: userId,
            });
            
            // Update the problem event with the work order ID
            await storage.updateProblemEvent(event.id, {
              workOrderId: workOrder.id
            });
            
            // Include the work order in the response
            event.workOrderId = workOrder.id;
            
            // TODO: If notification is enabled, send notification to maintenance team
            if (notifyMaintenance || button.notifyMaintenance) {
              // This would call a notification service in a real implementation
              console.log(`Notification should be sent for work order ${workOrder.id}`);
            }
          }
        } catch (workOrderError) {
          console.error('Failed to create work order:', workOrderError);
          // Still return the event, even if work order creation failed
        }
      }
      
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/problem-events/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      
      // Process date fields to ensure they're proper Date objects
      const updates = { ...req.body };
      
      // Convert string dates to Date objects
      if (updates.timestamp && typeof updates.timestamp === 'string') {
        updates.timestamp = new Date(updates.timestamp);
      }
      if (updates.resolvedAt && typeof updates.resolvedAt === 'string') {
        updates.resolvedAt = new Date(updates.resolvedAt);
      }
      
      const event = await storage.updateProblemEvent(id, updates);
      res.json(event);
    } catch (error) {
      console.error('Error updating problem event:', error);
      next(error);
    }
  });
  
  app.post("/api/problem-events/:id/resolve", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { solutionNotes } = req.body;
      
      // Update the event with solution notes and resolve it
      const event = await storage.updateProblemEvent(id, { solutionNotes });
      const resolvedEvent = await storage.resolveProblemEvent(id, userId);
      
      res.json(resolvedEvent);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}