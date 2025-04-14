import { User, WorkOrder, Asset, MaintenanceSchedule, InsertUser, InsertWorkOrder, InsertAsset, InsertMaintenanceSchedule, WorkOrderAttachment, InsertWorkOrderAttachment, MaintenanceCompletion, InsertMaintenanceCompletion, ProblemButton, InsertProblemButton, ProblemEvent, InsertProblemEvent, MaintenanceChangeLog, InsertMaintenanceChangeLog } from "@shared/schema";
import { users, workOrders, assets, maintenanceSchedules, workOrderAttachments, maintenanceCompletions, problemButtons, problemEvents, maintenanceChangeLogs } from "@shared/schema";
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
  createMaintenanceSchedule(schedule: InsertMaintenanceSchedule, userId?: number): Promise<MaintenanceSchedule>;
  getMaintenanceSchedules(): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedulesByDateRange(start: Date, end: Date): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined>;
  updateMaintenanceSchedule(id: number, schedule: Partial<MaintenanceSchedule>, userId?: number): Promise<MaintenanceSchedule>;
  deleteMaintenanceSchedule(id: number, userId?: number): Promise<void>;

  // Maintenance Change Logs
  createMaintenanceChangeLog(log: InsertMaintenanceChangeLog): Promise<MaintenanceChangeLog>;
  getMaintenanceChangeLogs(scheduleId: number): Promise<MaintenanceChangeLog[]>;
  
  // Maintenance Completions
  getMaintenanceCompletions(): Promise<MaintenanceCompletion[]>;
  createMaintenanceCompletion(completion: InsertMaintenanceCompletion): Promise<MaintenanceCompletion>;
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
    try {
      // Use the ORM approach first
      return await db.select().from(workOrders);
    } catch (error) {
      console.error('Error in getWorkOrders using ORM:', error);
      
      // Fallback to raw query if ORM fails (likely due to schema mismatch)
      try {
        const { rows } = await pool.query(`
          SELECT 
            id, title, description, status, priority, assigned_to AS "assignedTo",
            asset_id AS "assetId", reported_date AS "reportedDate", due_date AS "dueDate",
            completed_date AS "completedDate", 
            parts_required AS "partsRequired", problem_details AS "problemDetails",
            solution_notes AS "solutionNotes", created_by AS "createdBy",
            created_at AS "createdAt", updated_at AS "updatedAt", 
            false AS "affectsAssetStatus"  -- Default value if column doesn't exist
          FROM work_orders
        `);
        
        // Format date fields
        return rows.map(row => ({
          ...row,
          reportedDate: row.reportedDate ? new Date(row.reportedDate) : null,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          completedDate: row.completedDate ? new Date(row.completedDate) : null,
          createdAt: row.createdAt ? new Date(row.createdAt) : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
        }));
      } catch (fallbackError) {
        console.error('Error in getWorkOrders fallback query:', fallbackError);
        throw fallbackError; // Re-throw if both approaches fail
      }
    }
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    try {
      // Try using the ORM first
      const [workOrder] = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, id));
      return workOrder;
    } catch (error) {
      console.error('Error in getWorkOrder using ORM:', error);
      
      // Fallback to raw query if ORM fails (likely due to schema mismatch)
      try {
        const { rows } = await pool.query(`
          SELECT 
            id, title, description, status, priority, assigned_to AS "assignedTo",
            asset_id AS "assetId", reported_date AS "reportedDate", due_date AS "dueDate",
            completed_date AS "completedDate", 
            parts_required AS "partsRequired", problem_details AS "problemDetails",
            solution_notes AS "solutionNotes", created_by AS "createdBy",
            created_at AS "createdAt", updated_at AS "updatedAt", 
            false AS "affectsAssetStatus"  -- Default value if column doesn't exist
          FROM work_orders
          WHERE id = $1
        `, [id]);
        
        if (rows.length === 0) return undefined;
        
        // Format date fields
        const row = rows[0];
        return {
          ...row,
          reportedDate: row.reportedDate ? new Date(row.reportedDate) : null,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          completedDate: row.completedDate ? new Date(row.completedDate) : null,
          createdAt: row.createdAt ? new Date(row.createdAt) : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
        };
      } catch (fallbackError) {
        console.error('Error in getWorkOrder fallback query:', fallbackError);
        return undefined; // Return undefined instead of throwing to be consistent with ORM approach
      }
    }
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
          else if (key === 'affectsAssetStatus') updateData.affectsAssetStatus = updates.affectsAssetStatus;
          else if (key === 'partsRequired') updateData.partsRequired = updates.partsRequired;
          else if (key === 'problemDetails') updateData.problemDetails = updates.problemDetails;
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
      
      try {
        // Try using the ORM first
        const [workOrder] = await db
          .update(workOrders)
          .set(updateData)
          .where(eq(workOrders.id, id))
          .returning();
    
        if (!workOrder) throw new Error("Work order not found");
        return workOrder;
      } catch (ormError) {
        console.error('ORM update failed, falling back to raw query:', ormError);
        
        // Create query dynamically to handle potential schema differences
        const fields = [];
        const values = [id]; // First param is always id
        let paramIndex = 2; // Start at $2
        
        // Build update fields and values
        Object.keys(updateData).forEach(key => {
          // Skip affectsAssetStatus if it might not exist in Docker
          if (key === 'affectsAssetStatus') return;
          
          // Convert camelCase to snake_case for SQL
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          fields.push(`${snakeKey} = $${paramIndex}`);
          
          // Format dates for SQL
          if (updateData[key] instanceof Date) {
            values.push(updateData[key].toISOString());
          } else {
            values.push(updateData[key]);
          }
          
          paramIndex++;
        });
        
        if (fields.length === 0) {
          throw new Error("No valid fields to update");
        }
        
        const updateQuery = `
          UPDATE work_orders
          SET ${fields.join(', ')}
          WHERE id = $1
          RETURNING *
        `;
        
        const { rows } = await pool.query(updateQuery, values);
        
        if (rows.length === 0) {
          throw new Error("Work order not found");
        }
        
        // Format response to match expected WorkOrder type
        const result = {
          ...rows[0],
          assignedTo: rows[0].assigned_to,
          assetId: rows[0].asset_id,
          reportedDate: rows[0].reported_date ? new Date(rows[0].reported_date) : null,
          completedDate: rows[0].completed_date ? new Date(rows[0].completed_date) : null,
          dueDate: rows[0].due_date ? new Date(rows[0].due_date) : null,
          createdAt: rows[0].created_at ? new Date(rows[0].created_at) : null,
          updatedAt: rows[0].updated_at ? new Date(rows[0].updated_at) : null,
          affectsAssetStatus: false, // Default value as it's missing in Docker
          partsRequired: rows[0].parts_required,
          problemDetails: rows[0].problem_details,
          solutionNotes: rows[0].solution_notes,
          createdBy: rows[0].created_by
        };
        
        // Return the result
        return result;
      }
      
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

  async createMaintenanceSchedule(schedule: InsertMaintenanceSchedule, userId?: number): Promise<MaintenanceSchedule> {
    const [newSchedule] = await db.insert(maintenanceSchedules).values(schedule).returning();
    
    // Log the creation
    await this.createMaintenanceChangeLog({
      scheduleId: newSchedule.id,
      changedBy: userId || null,
      changeType: "CREATE",
      newValue: JSON.stringify(newSchedule),
    });
    
    return newSchedule;
  }

  async getMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    try {
      const schedules = await db.select().from(maintenanceSchedules);
      // Add default value for affectsAssetStatus if it doesn't exist in the database
      return schedules.map(schedule => ({
        ...schedule,
        affectsAssetStatus: schedule.affectsAssetStatus === undefined ? false : schedule.affectsAssetStatus,
      }));
    } catch (error) {
      console.error('Error fetching maintenance schedules:', error);
      // Try raw query as fallback if schema issues
      try {
        const result = await db.execute(`
          SELECT id, title, description, asset_id as "assetId", 
                 start_date as "startDate", end_date as "endDate", 
                 frequency, last_completed as "lastCompleted", status,
                 FALSE as "affectsAssetStatus"
          FROM maintenance_schedules
        `);
        return result.rows;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  async getMaintenanceSchedulesByDateRange(start: Date, end: Date): Promise<MaintenanceSchedule[]> {
    try {
      const schedules = await db
        .select()
        .from(maintenanceSchedules)
        .where(
          and(
            gte(maintenanceSchedules.startDate, start),
            lte(maintenanceSchedules.endDate, end)
          )
        );
      
      // Add default value for affectsAssetStatus if it doesn't exist in the database
      return schedules.map(schedule => ({
        ...schedule,
        affectsAssetStatus: schedule.affectsAssetStatus === undefined ? false : schedule.affectsAssetStatus,
      }));
    } catch (error) {
      console.error('Error fetching maintenance schedules by date range:', error);
      // Try raw query as fallback if schema issues
      try {
        const startDate = start instanceof Date ? start.toISOString() : start;
        const endDate = end instanceof Date ? end.toISOString() : end;
        
        const result = await pool.query(`
          SELECT id, title, description, asset_id as "assetId", 
                 start_date as "startDate", end_date as "endDate", 
                 frequency, last_completed as "lastCompleted", status,
                 FALSE as "affectsAssetStatus"
          FROM maintenance_schedules
          WHERE start_date >= $1 AND end_date <= $2
        `, [startDate, endDate]);
        
        // Convert result to proper MaintenanceSchedule objects
        return (result.rows as any[]).map(row => {
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            assetId: row.assetId,
            startDate: new Date(row.startDate),
            endDate: row.endDate ? new Date(row.endDate) : null,
            frequency: row.frequency,
            lastCompleted: row.lastCompleted ? new Date(row.lastCompleted) : null,
            status: row.status,
            affectsAssetStatus: row.affectsAssetStatus === undefined ? false : row.affectsAssetStatus,
          };
        });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    try {
      const [schedule] = await db
        .select()
        .from(maintenanceSchedules)
        .where(eq(maintenanceSchedules.id, id));
      
      if (schedule) {
        // Add default value for affectsAssetStatus if it doesn't exist in the database
        return {
          ...schedule,
          affectsAssetStatus: schedule.affectsAssetStatus === undefined ? false : schedule.affectsAssetStatus,
        };
      }
      return schedule;
    } catch (error) {
      console.error(`Error fetching maintenance schedule ${id}:`, error);
      // Try raw query as fallback if schema issues
      try {
        const result = await pool.query(`
          SELECT id, title, description, asset_id as "assetId", 
                 start_date as "startDate", end_date as "endDate", 
                 frequency, last_completed as "lastCompleted", status,
                 FALSE as "affectsAssetStatus"
          FROM maintenance_schedules
          WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
          return undefined;
        }
        
        const row = result.rows[0] as any;
        // Properly convert the raw result to a MaintenanceSchedule object
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          assetId: row.assetId,
          startDate: new Date(row.startDate),
          endDate: row.endDate ? new Date(row.endDate) : null,
          frequency: row.frequency,
          lastCompleted: row.lastCompleted ? new Date(row.lastCompleted) : null,
          status: row.status,
          affectsAssetStatus: row.affectsAssetStatus === undefined ? false : !!row.affectsAssetStatus,
        };
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  async updateMaintenanceSchedule(id: number, updates: Partial<MaintenanceSchedule>, userId?: number): Promise<MaintenanceSchedule> {
    try {
      // Get the original schedule to compare for changes
      const originalSchedule = await this.getMaintenanceSchedule(id);
      if (!originalSchedule) {
        throw new Error("Maintenance schedule not found");
      }
      
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
        return originalSchedule;
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
      const updatedSchedule: any = {};
      Object.keys(rows[0]).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        updatedSchedule[camelKey] = rows[0][key];
      });
      
      // Log changes to the maintenance change logs table
      const changedFields = Object.keys(cleanUpdates);
      for (const field of changedFields) {
        const oldValue = originalSchedule[field as keyof MaintenanceSchedule];
        const newValue = cleanUpdates[field];
        
        // Only log if values are different
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          await this.createMaintenanceChangeLog({
            scheduleId: id,
            changedBy: userId || null,
            changeType: "EDIT",
            fieldName: field,
            oldValue: JSON.stringify(oldValue),
            newValue: JSON.stringify(newValue),
          });
        }
      }
      
      return updatedSchedule as MaintenanceSchedule;
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

  async createMaintenanceChangeLog(log: InsertMaintenanceChangeLog): Promise<MaintenanceChangeLog> {
    const [newLog] = await db.insert(maintenanceChangeLogs).values(log).returning();
    return newLog;
  }

  async getMaintenanceChangeLogs(scheduleId: number): Promise<MaintenanceChangeLog[]> {
    return await db
      .select()
      .from(maintenanceChangeLogs)
      .where(eq(maintenanceChangeLogs.scheduleId, scheduleId))
      .orderBy(desc(maintenanceChangeLogs.changedAt));
  }

  async deleteMaintenanceSchedule(id: number, userId?: number): Promise<void> {
    // First get the schedule to record it for change logs
    const schedule = await this.getMaintenanceSchedule(id);
    
    if (schedule) {
      // Log the deletion
      await this.createMaintenanceChangeLog({
        scheduleId: id,
        changedBy: userId || null,
        changeType: "DELETE",
        oldValue: JSON.stringify(schedule),
        newValue: "",
      });
    }
    
    // Delete all related maintenance completions
    await db
      .delete(maintenanceCompletions)
      .where(eq(maintenanceCompletions.scheduleId, id));
      
    // Delete all related change logs
    await db
      .delete(maintenanceChangeLogs)
      .where(eq(maintenanceChangeLogs.scheduleId, id));

    // Then delete the maintenance schedule
    await db
      .delete(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
  }

  async checkAndArchiveCompletedWorkOrders(): Promise<void> {
    try {
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get all completed work orders - using raw query to avoid schema mismatches
      const { rows } = await pool.query(`
        SELECT id, status, completed_date
        FROM work_orders
        WHERE status = $1 AND completed_date <= $2
      `, [WorkOrderStatus.COMPLETED, fortyEightHoursAgo]);

      // Archive orders completed more than 48 hours ago
      for (const order of rows) {
        await this.updateWorkOrder(order.id, {
          status: WorkOrderStatus.ARCHIVED
        });
      }
    } catch (error) {
      console.error('Error in checkAndArchiveCompletedWorkOrders:', error);
      // Continue operation even if this process fails - it's not critical
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