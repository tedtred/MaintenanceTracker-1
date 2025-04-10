import { User, WorkOrder, Asset, MaintenanceSchedule, InsertUser, InsertWorkOrder, InsertAsset, InsertMaintenanceSchedule, WorkOrderAttachment, InsertWorkOrderAttachment, MaintenanceCompletion, InsertMaintenanceCompletion, ProblemButton, InsertProblemButton, ProblemEvent, InsertProblemEvent } from "@shared/schema";
import { users, workOrders, assets, maintenanceSchedules, workOrderAttachments, maintenanceCompletions, problemButtons, problemEvents } from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { Settings, InsertSettings, settings } from "@shared/schema";

const PostgresSessionStore = connectPg(session);

// Added WorkOrderStatus enum for type safety
enum WorkOrderStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Add deleteUser method to the interface
export interface IStorage {
  // Session
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>; 
  updateUserRole(userId: number, role: string): Promise<User>;
  updateUserPagePermissions(userId: number, permissions: string[]): Promise<User>; // Add page permissions method
  updateUserDefaultLandingPage(userId: number, defaultLandingPage: string): Promise<User>; // Add default landing page method
  getPendingUsers(): Promise<User[]>;
  approveUser(userId: number): Promise<User>;
  deleteUser(userId: number): Promise<void>;

  // Work Orders
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  updateWorkOrder(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: number): Promise<void>;

  // Work Order Attachments
  createWorkOrderAttachment(attachment: InsertWorkOrderAttachment): Promise<WorkOrderAttachment>;
  getWorkOrderAttachments(workOrderId: number): Promise<WorkOrderAttachment[]>;

  // Assets
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;

  // Maintenance Schedules
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  getMaintenanceSchedules(): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedulesByDateRange(start: Date, end: Date): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined>;
  updateMaintenanceSchedule(id: number, schedule: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule>;

  // Maintenance Completions
  getMaintenanceCompletions(): Promise<MaintenanceCompletion[]>;
  createMaintenanceCompletion(completion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion>;
  deleteMaintenanceSchedule(id: number): Promise<void>;
  checkAndArchiveCompletedWorkOrders(): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  
  // Problem tracking
  getProblemButtons(): Promise<ProblemButton[]>;
  getProblemButton(id: number): Promise<ProblemButton | undefined>;
  createProblemButton(button: InsertProblemButton): Promise<ProblemButton>;
  updateProblemButton(id: number, button: Partial<ProblemButton>): Promise<ProblemButton>;
  deleteProblemButton(id: number): Promise<void>;
  
  // Problem events
  getProblemEvents(): Promise<ProblemEvent[]>;
  getProblemEventsByDate(startDate: Date, endDate: Date): Promise<ProblemEvent[]>;
  getProblemEvent(id: number): Promise<ProblemEvent | undefined>;
  createProblemEvent(event: InsertProblemEvent): Promise<ProblemEvent>;
  updateProblemEvent(id: number, event: Partial<ProblemEvent>): Promise<ProblemEvent>;
  resolveProblemEvent(id: number, userId: number): Promise<ProblemEvent>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // New method to get all users
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Update user role
  async updateUserRole(userId: number, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  // Update user page permissions
  async updateUserPagePermissions(userId: number, permissions: string[]): Promise<User> {
    const permissionsJson = JSON.stringify(permissions);
    const [updatedUser] = await db
      .update(users)
      .set({ pagePermissions: permissionsJson })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }
  
  // Update user default landing page
  async updateUserDefaultLandingPage(userId: number, defaultLandingPage: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ defaultLandingPage })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async getPendingUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.approved, false));
  }

  async approveUser(userId: number): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ approved: true })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }


  // Work Order Methods
  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values({
      ...workOrder,
      reportedDate: new Date(),
    }).returning();
    return newWorkOrder;
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders);
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const [workOrder] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, id));
    return workOrder;
  }

  async updateWorkOrder(id: number, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    try {
      // Get the current work order state to check for status change
      const currentWorkOrder = await this.getWorkOrder(id);
      if (!currentWorkOrder) {
        throw new Error("Work order not found");
      }
      
      // Determine if this is a status change to COMPLETED
      const isCompletingWorkOrder = 
        updates.status === WorkOrderStatus.COMPLETED && 
        currentWorkOrder.status !== WorkOrderStatus.COMPLETED;
      
      // Handle status change to COMPLETED
      const updateData: Partial<WorkOrder> = {};
      
      // Only include valid fields to update
      const dateFields = ['reportedDate', 'completedDate', 'dueDate', 'updatedAt'];
      
      // Copy non-date fields as is
      Object.keys(updates).forEach(key => {
        if (!dateFields.includes(key)) {
          // Type-safe assignment based on known work order fields
          if (key === 'id') updateData.id = updates.id;
          else if (key === 'title') updateData.title = updates.title;
          else if (key === 'description') updateData.description = updates.description;
          else if (key === 'status') updateData.status = updates.status;
          else if (key === 'priority') updateData.priority = updates.priority;
          else if (key === 'assignedTo') updateData.assignedTo = updates.assignedTo;
          else if (key === 'assetId') updateData.assetId = updates.assetId;
          else if (key === 'notes') updateData.notes = updates.notes;
          else if (key === 'solutionNotes') updateData.solutionNotes = updates.solutionNotes;
        }
      });
      
      // Set completedDate automatically if status changes to COMPLETED
      if (isCompletingWorkOrder && !updates.completedDate) {
        updateData.completedDate = new Date();
      }
      
      // Process date fields - convert strings to Date objects
      if ('reportedDate' in updates) {
        const value = updates.reportedDate;
        if (value === null) {
          updateData.reportedDate = null as any; // Type coercion needed
        } else if (typeof value === 'string') {
          updateData.reportedDate = new Date(value);
        } else if (value instanceof Date) {
          updateData.reportedDate = value;
        }
      }
      
      if ('completedDate' in updates) {
        const value = updates.completedDate;
        if (value === null) {
          updateData.completedDate = null;
        } else if (typeof value === 'string') {
          updateData.completedDate = new Date(value);
        } else if (value instanceof Date) {
          updateData.completedDate = value;
        }
      }
      
      if ('dueDate' in updates) {
        const value = updates.dueDate;
        if (value === null) {
          updateData.dueDate = null;
        } else if (typeof value === 'string') {
          updateData.dueDate = new Date(value);
        } else if (value instanceof Date) {
          updateData.dueDate = value;
        }
      }
      
      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();
      
      console.log('Work order update data:', JSON.stringify(updateData, (key, value) => 
        value instanceof Date ? value.toISOString() : value
      ));
      
      const [workOrder] = await db
        .update(workOrders)
        .set(updateData)
        .where(eq(workOrders.id, id))
        .returning();
  
      if (!workOrder) throw new Error("Work order not found");
      
      // If we're completing a work order, check for related problem events to mark as resolved
      if (isCompletingWorkOrder) {
        // Find any problem events that reference this work order
        const relatedProblemEvents = await db
          .select()
          .from(problemEvents)
          .where(eq(problemEvents.workOrderId, id));
          
        // If this work order is linked to problem events, resolve them too
        for (const event of relatedProblemEvents) {
          if (!event.resolved) {
            console.log(`Automatically resolving problem event ${event.id} because work order ${id} was completed`);
            await this.resolveProblemEvent(event.id, workOrder.assignedTo || event.userId);
          }
        }
      }
      
      return workOrder;
    } catch (error) {
      console.error("Error in updateWorkOrder:", error);
      throw error;
    }
  }

  async createWorkOrderAttachment(attachment: InsertWorkOrderAttachment): Promise<WorkOrderAttachment> {
    const [newAttachment] = await db.insert(workOrderAttachments).values(attachment).returning();
    return newAttachment;
  }

  async getWorkOrderAttachments(workOrderId: number): Promise<WorkOrderAttachment[]> {
    return await db
      .select()
      .from(workOrderAttachments)
      .where(eq(workOrderAttachments.workOrderId, workOrderId));
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    try {
      // Clean up the updates object to ensure it only contains valid fields
      const cleanUpdates: Record<string, any> = {};
      
      // Only include valid fields that exist in the database schema
      if ('name' in updates) cleanUpdates.name = updates.name;
      if ('description' in updates) cleanUpdates.description = updates.description;
      if ('category' in updates) cleanUpdates.category = updates.category;
      if ('location' in updates) cleanUpdates.location = updates.location;
      if ('purchaseDate' in updates) cleanUpdates.purchaseDate = updates.purchaseDate;
      if ('purchaseCost' in updates) cleanUpdates.purchaseCost = updates.purchaseCost;
      if ('serialNumber' in updates) cleanUpdates.serialNumber = updates.serialNumber;
      if ('status' in updates) cleanUpdates.status = updates.status;
      if ('model' in updates) cleanUpdates.model = updates.model;
      if ('manufacturer' in updates) cleanUpdates.manufacturer = updates.manufacturer;
      if ('warrantyExpirationDate' in updates) cleanUpdates.warrantyExpirationDate = updates.warrantyExpirationDate;
      
      // Handle case where there are no fields to update
      if (Object.keys(cleanUpdates).length === 0) {
        // Just return the current asset
        const { rows } = await pool.query(
          `SELECT * FROM assets WHERE id = $1`,
          [id]
        );
        if (rows.length === 0) throw new Error("Asset not found");
        return rows[0];
      }
      
      // Directly use SQL for more control and error handling
      const query = `
        UPDATE assets
        SET ${Object.keys(cleanUpdates).map(key => {
          // Convert camelCase keys to snake_case for SQL
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          return `${snakeKey} = $${Object.keys(cleanUpdates).indexOf(key) + 2}`;
        }).join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [id, ...Object.values(cleanUpdates)];
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) throw new Error("Asset not found");
      
      // Convert snake_case keys back to camelCase
      const asset: any = {};
      Object.keys(rows[0]).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        asset[camelKey] = rows[0][key];
      });
      
      return asset as Asset;
    } catch (error) {
      console.error("Error updating asset:", error);
      throw error;
    }
  }

  async deleteAsset(id: number): Promise<void> {
    // First check if there are any related maintenance schedules
    const relatedSchedules = await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.assetId, id));

    // If there are maintenance schedules, delete them first
    for (const schedule of relatedSchedules) {
      await this.deleteMaintenanceSchedule(schedule.id);
    }

    // Delete the asset
    await db.delete(assets).where(eq(assets.id, id));
  }

  async createMaintenanceSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const [newSchedule] = await db.insert(maintenanceSchedules).values(schedule).returning();
    return newSchedule;
  }

  async getMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return await db.select().from(maintenanceSchedules);
  }

  async getMaintenanceSchedulesByDateRange(start: Date, end: Date): Promise<MaintenanceSchedule[]> {
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(
        and(
          gte(maintenanceSchedules.startDate, start),
          lte(maintenanceSchedules.endDate, end)
        )
      );
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    return schedule;
  }

  async updateMaintenanceSchedule(id: number, updates: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
    try {
      // Clean up the updates object to ensure it only contains valid fields
      const cleanUpdates: Record<string, any> = {};
      
      // Only include valid fields that exist in the database schema
      if ('title' in updates) cleanUpdates.title = updates.title;
      if ('description' in updates) cleanUpdates.description = updates.description;
      if ('assetId' in updates) cleanUpdates.assetId = updates.assetId;
      if ('startDate' in updates) cleanUpdates.startDate = updates.startDate;
      if ('endDate' in updates) cleanUpdates.endDate = updates.endDate;
      if ('frequency' in updates) cleanUpdates.frequency = updates.frequency;
      if ('lastCompleted' in updates) cleanUpdates.lastCompleted = updates.lastCompleted;
      if ('status' in updates) cleanUpdates.status = updates.status;
      if ('affectsAssetStatus' in updates) cleanUpdates.affectsAssetStatus = updates.affectsAssetStatus;
      
      // Handle case where there are no fields to update
      if (Object.keys(cleanUpdates).length === 0) {
        // Just return the current schedule
        const { rows } = await pool.query(
          `SELECT * FROM maintenance_schedules WHERE id = $1`,
          [id]
        );
        if (rows.length === 0) throw new Error("Maintenance schedule not found");
        return rows[0];
      }
      
      // Directly use SQL for more control and error handling
      const query = `
        UPDATE maintenance_schedules
        SET ${Object.keys(cleanUpdates).map(key => {
          // Convert camelCase keys to snake_case for SQL
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          return `${snakeKey} = $${Object.keys(cleanUpdates).indexOf(key) + 2}`;
        }).join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [id, ...Object.values(cleanUpdates)];
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) throw new Error("Maintenance schedule not found");
      
      // Convert snake_case keys back to camelCase
      const schedule: any = {};
      Object.keys(rows[0]).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        schedule[camelKey] = rows[0][key];
      });
      
      return schedule as MaintenanceSchedule;
    } catch (error) {
      console.error("Error updating maintenance schedule:", error);
      throw error;
    }
  }

  async getMaintenanceCompletions(): Promise<MaintenanceCompletion[]> {
    return await db.select().from(maintenanceCompletions);
  }

  async createMaintenanceCompletion(completion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion> {
    const [newCompletion] = await db.insert(maintenanceCompletions).values(completion).returning();
    return newCompletion;
  }

  async deleteMaintenanceSchedule(id: number): Promise<void> {
    // First delete all related maintenance completions
    await db
      .delete(maintenanceCompletions)
      .where(eq(maintenanceCompletions.scheduleId, id));

    // Then delete the maintenance schedule
    await db
      .delete(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
  }

  async checkAndArchiveCompletedWorkOrders(): Promise<void> {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get all completed work orders
    const completedOrders = await db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.status, WorkOrderStatus.COMPLETED),
          lte(workOrders.completedDate, fortyEightHoursAgo)
        )
      );

    // Archive orders completed more than 48 hours ago
    for (const order of completedOrders) {
      await this.updateWorkOrder(order.id, {
        status: WorkOrderStatus.ARCHIVED
      });
    }
  }

  async deleteWorkOrder(id: number): Promise<void> {
    try {
      // First check if there are problem events referencing this work order
      const problemEventsQuery = await db
        .select()
        .from(problemEvents)
        .where(eq(problemEvents.workOrderId, id));
      
      // If problem events reference this work order, update them to remove the reference
      if (problemEventsQuery.length > 0) {
        console.log(`Found ${problemEventsQuery.length} problem events referencing work order ${id}, updating them first`);
        
        for (const event of problemEventsQuery) {
          await db
            .update(problemEvents)
            .set({ workOrderId: null })
            .where(eq(problemEvents.id, event.id));
        }
      }
      
      // Delete any attachments
      await db
        .delete(workOrderAttachments)
        .where(eq(workOrderAttachments.workOrderId, id));
  
      // Then delete the work order
      await db.delete(workOrders).where(eq(workOrders.id, id));
      
      console.log(`Successfully deleted work order ${id}`);
    } catch (error) {
      console.error("Error deleting work order:", error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  // Settings Methods
  async getSettings(): Promise<Settings> {
    const [settingsResult] = await db
      .select()
      .from(settings)
      .orderBy(desc(settings.updatedAt))
      .limit(1);

    if (!settingsResult) {
      // Create default settings if none exist
      return this.updateSettings({
        workWeekStart: 1,
        workWeekEnd: 5,
        workDayStart: "09:00",
        workDayEnd: "17:00",
        timeZone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "HH:mm"
      });
    }

    return settingsResult;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    // Get current settings record
    const existingSettings = await this.getSettings();
    
    // Update the existing record
    const [updatedSettings] = await db
      .update(settings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(settings.id, existingSettings.id))
      .returning();

    return updatedSettings;
  }

  // Problem tracking methods
  async getProblemButtons(): Promise<ProblemButton[]> {
    return await db
      .select()
      .from(problemButtons)
      .orderBy(asc(problemButtons.order));
  }

  async getProblemButton(id: number): Promise<ProblemButton | undefined> {
    const [button] = await db
      .select()
      .from(problemButtons)
      .where(eq(problemButtons.id, id));
    return button;
  }

  async createProblemButton(button: InsertProblemButton): Promise<ProblemButton> {
    // Get the current highest order value
    const buttons = await this.getProblemButtons();
    const highestOrder = buttons.length > 0 
      ? Math.max(...buttons.map(b => b.order))
      : -1;

    const [newButton] = await db
      .insert(problemButtons)
      .values({
        ...button,
        order: button.order || highestOrder + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return newButton;
  }

  async updateProblemButton(id: number, updates: Partial<ProblemButton>): Promise<ProblemButton> {
    const [updatedButton] = await db
      .update(problemButtons)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(problemButtons.id, id))
      .returning();
    
    if (!updatedButton) {
      throw new Error("Button not found");
    }
    
    return updatedButton;
  }

  async deleteProblemButton(id: number): Promise<void> {
    await db.delete(problemButtons).where(eq(problemButtons.id, id));
  }

  // Problem events methods
  async getProblemEvents(): Promise<ProblemEvent[]> {
    return await db
      .select()
      .from(problemEvents)
      .orderBy(desc(problemEvents.timestamp));
  }

  async getProblemEventsByDate(startDate: Date, endDate: Date): Promise<ProblemEvent[]> {
    return await db
      .select()
      .from(problemEvents)
      .where(
        and(
          gte(problemEvents.timestamp, startDate),
          lte(problemEvents.timestamp, endDate)
        )
      )
      .orderBy(desc(problemEvents.timestamp));
  }

  async getProblemEvent(id: number): Promise<ProblemEvent | undefined> {
    const [event] = await db
      .select()
      .from(problemEvents)
      .where(eq(problemEvents.id, id));
    return event;
  }

  async createProblemEvent(event: InsertProblemEvent): Promise<ProblemEvent> {
    const [newEvent] = await db
      .insert(problemEvents)
      .values({
        ...event,
        timestamp: event.timestamp || new Date()
      })
      .returning();
    
    return newEvent;
  }

  async updateProblemEvent(id: number, updates: Partial<ProblemEvent>): Promise<ProblemEvent> {
    // Ensure dates are properly formatted
    const updateData = { ...updates };
    
    if (updateData.timestamp && typeof updateData.timestamp === 'string') {
      updateData.timestamp = new Date(updateData.timestamp);
    }
    
    if (updateData.resolvedAt && typeof updateData.resolvedAt === 'string') {
      updateData.resolvedAt = new Date(updateData.resolvedAt);
    }
    
    const [updatedEvent] = await db
      .update(problemEvents)
      .set(updateData)
      .where(eq(problemEvents.id, id))
      .returning();
    
    if (!updatedEvent) {
      throw new Error("Event not found");
    }
    
    return updatedEvent;
  }

  async resolveProblemEvent(id: number, userId: number): Promise<ProblemEvent> {
    try {
      // Get the current problem event state to check if it's already resolved
      const currentEvent = await this.getProblemEvent(id);
      if (!currentEvent) {
        throw new Error("Problem event not found");
      }
      
      // Don't do anything if already resolved
      if (currentEvent.resolved) {
        return currentEvent;
      }

      // Mark the problem event as resolved
      const [resolvedEvent] = await db
        .update(problemEvents)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: userId
        })
        .where(eq(problemEvents.id, id))
        .returning();
      
      if (!resolvedEvent) {
        throw new Error("Problem event not found");
      }
      
      // If this problem event has a linked work order, check if it should be completed too
      if (resolvedEvent.workOrderId) {
        const workOrder = await this.getWorkOrder(resolvedEvent.workOrderId);
        
        // Only update if the work order exists and isn't already completed
        if (workOrder && workOrder.status !== WorkOrderStatus.COMPLETED && 
            workOrder.status !== WorkOrderStatus.ARCHIVED) {
          console.log(`Automatically completing work order ${workOrder.id} because problem event ${id} was resolved`);
          
          await this.updateWorkOrder(workOrder.id, {
            status: WorkOrderStatus.COMPLETED,
            solutionNotes: workOrder.solutionNotes 
              ? `${workOrder.solutionNotes}\nAutomatically completed when problem was resolved.` 
              : "Automatically completed when problem was resolved."
          });
        }
      }
      
      return resolvedEvent;
    } catch (error) {
      console.error("Error resolving problem event:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();