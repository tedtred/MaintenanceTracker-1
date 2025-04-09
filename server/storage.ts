import { User, WorkOrder, Asset, MaintenanceSchedule, InsertUser, InsertWorkOrder, InsertAsset, InsertMaintenanceSchedule, WorkOrderAttachment, InsertWorkOrderAttachment, MaintenanceCompletion, InsertMaintenanceCompletion } from "@shared/schema";
import { users, workOrders, assets, maintenanceSchedules, workOrderAttachments, maintenanceCompletions } from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte, desc } from "drizzle-orm";
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
    // Handle status change to COMPLETED
    const updateData: Partial<WorkOrder> = { ...updates };

    if (updates.status === WorkOrderStatus.COMPLETED && !updates.completedDate) {
      updateData.completedDate = new Date();
    }

    // Ensure dates are properly formatted
    if (updateData.reportedDate && typeof updateData.reportedDate === 'string') {
      updateData.reportedDate = new Date(updateData.reportedDate);
    }

    if (updateData.completedDate && typeof updateData.completedDate === 'string') {
      updateData.completedDate = new Date(updateData.completedDate);
    }

    const [workOrder] = await db
      .update(workOrders)
      .set(updateData)
      .where(eq(workOrders.id, id))
      .returning();

    if (!workOrder) throw new Error("Work order not found");
    return workOrder;
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
    // First delete any attachments
    await db
      .delete(workOrderAttachments)
      .where(eq(workOrderAttachments.workOrderId, id));

    // Then delete the work order
    await db.delete(workOrders).where(eq(workOrders.id, id));
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
    const [updatedSettings] = await db
      .insert(settings)
      .values({
        ...updates,
        updatedAt: new Date()
      })
      .returning();

    return updatedSettings;
  }
}

export const storage = new DatabaseStorage();