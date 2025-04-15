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
    try {
      // Detect environment - different handling for Docker
      const isDockerEnvironment = process.env.DOCKER_ENV === 'true' || 
                                 process.env.RUNNING_IN_DOCKER === 'true' || 
                                 process.env.IS_DOCKER === 'true';
      console.log('Running in Docker environment?', isDockerEnvironment);
      
      // Debug the incoming work order
      console.log('Input work order data:', 
        JSON.stringify(workOrder, (key, value) => {
          if (value instanceof Date) return value.toISOString();
          return value;
        })
      );
      
      if (isDockerEnvironment) {
        // DOCKER-SPECIFIC IMPLEMENTATION
        // Only use non-JSON fields to completely avoid problems with JSON handling
        console.log('Using Docker-safe implementation - SKIPPING ALL JSON FIELDS');
        
        // Create work order with only basic fields
        const basicFields = {
          title: workOrder.title,
          description: workOrder.description,
          status: workOrder.status,
          priority: workOrder.priority,
          assignedTo: workOrder.assignedTo,
          assetId: workOrder.assetId,
          reportedDate: new Date()
        };
        
        // Convert to snake_case for SQL
        const columns = Object.keys(basicFields).map(k => k.replace(/([A-Z])/g, '_$1').toLowerCase());
        const placeholders = columns.map((_, i) => `$${i+1}`);
        const values = Object.values(basicFields);
        
        // Use direct SQL and avoid all JSON fields
        const query = `
          INSERT INTO work_orders (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING *
        `;
        
        console.log('Executing Docker-safe query:', query);
        console.log('With values:', values);
        
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
          throw new Error('Failed to create work order in Docker environment');
        }
        
        // Return minimal work order object with default values for JSON fields
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          assignedTo: row.assigned_to,
          assetId: row.asset_id,
          reportedDate: row.reported_date ? new Date(row.reported_date) : new Date(),
          dueDate: row.due_date ? new Date(row.due_date) : null,
          completedDate: row.completed_date ? new Date(row.completed_date) : null,
          affectsAssetStatus: false, // Docker doesn't have this column
          partsRequired: [], // Default empty array for JSON field
          problemDetails: '', // Default empty string for JSON field
          solutionNotes: '', // Default empty string for JSON field
          createdBy: row.created_by,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        };
        
      } else {
        // REPLIT/STANDARD IMPLEMENTATION
        console.log('Using standard ORM implementation for Replit environment');
        
        // Sanitize JSON fields for standard environment
        const sanitizedWorkOrder = {...workOrder};
        if ('notes' in sanitizedWorkOrder && sanitizedWorkOrder.notes === '') sanitizedWorkOrder.notes = null;
        if ('solutionNotes' in sanitizedWorkOrder && sanitizedWorkOrder.solutionNotes === '') sanitizedWorkOrder.solutionNotes = null;
        if ('problemDetails' in sanitizedWorkOrder && sanitizedWorkOrder.problemDetails === '') sanitizedWorkOrder.problemDetails = null;
        if ('partsRequired' in sanitizedWorkOrder && 
            (sanitizedWorkOrder.partsRequired === null || 
             sanitizedWorkOrder.partsRequired === undefined || 
             (Array.isArray(sanitizedWorkOrder.partsRequired) && sanitizedWorkOrder.partsRequired.length === 0))) {
          sanitizedWorkOrder.partsRequired = [];
        }
        
        try {
          // Use ORM in standard environment
          const [newWorkOrder] = await db.insert(workOrders).values({
            ...sanitizedWorkOrder,
            reportedDate: new Date(),
          }).returning();
          return newWorkOrder;
        } catch (error) {
          console.error('ORM creation failed in standard environment:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in createWorkOrder:', error);
      
      // One last attempt with absolute minimal fields if everything else fails
      try {
        console.log('Attempting absolute minimal fallback - last resort');
        
        // Create work order with only title and status
        const query = `
          INSERT INTO work_orders (title, status)
          VALUES ($1, $2)
          RETURNING *
        `;
        
        const { rows } = await pool.query(query, [
          workOrder.title || 'Emergency Work Order', 
          workOrder.status || 'OPEN'
        ]);
        
        if (rows.length === 0) {
          throw new Error('Critical failure: Could not create work order with minimal fields');
        }
        
        // Return minimal work order object
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          description: row.description || '',
          status: row.status,
          priority: row.priority || 'MEDIUM',
          assignedTo: row.assigned_to,
          assetId: row.asset_id,
          reportedDate: row.reported_date ? new Date(row.reported_date) : new Date(),
          dueDate: null,
          completedDate: null,
          affectsAssetStatus: false,
          partsRequired: [],
          problemDetails: '',
          solutionNotes: '',
          createdBy: null,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        };
      } catch (fallbackError) {
        console.error('Critical failure - even minimal fallback failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    try {
      // Use the ORM approach first
      return await db.select().from(workOrders);
    } catch (error) {
      console.error('Error in getWorkOrders using ORM:', error);
      
      // Fallback to raw query if ORM fails (likely due to schema mismatch)
      try {
        // Try with a more dynamic approach to handle potential missing columns
        // First, check what columns are actually in the table
        const tableInfo = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'work_orders'
        `);
        
        const availableColumns = tableInfo.rows.map(row => row.column_name);
        const hasPartsRequired = availableColumns.includes('parts_required');
        const hasProblemDetails = availableColumns.includes('problem_details');
        const hasSolutionNotes = availableColumns.includes('solution_notes');
        
        // Build a query that only includes columns that exist
        const { rows } = await pool.query(`
          SELECT 
            id, title, description, status, priority, assigned_to AS "assignedTo",
            asset_id AS "assetId", reported_date AS "reportedDate", due_date AS "dueDate",
            completed_date AS "completedDate", 
            ${hasPartsRequired ? 'parts_required AS "partsRequired",' : "'[]' AS \"partsRequired\","} 
            ${hasProblemDetails ? 'problem_details AS "problemDetails",' : "'' AS \"problemDetails\","} 
            ${hasSolutionNotes ? 'solution_notes AS "solutionNotes",' : "'' AS \"solutionNotes\","} 
            created_by AS "createdBy",
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
        // Try with a more dynamic approach to handle potential missing columns
        // First, check what columns are actually in the table
        const tableInfo = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'work_orders'
        `);
        
        const availableColumns = tableInfo.rows.map(row => row.column_name);
        const hasPartsRequired = availableColumns.includes('parts_required');
        const hasProblemDetails = availableColumns.includes('problem_details');
        const hasSolutionNotes = availableColumns.includes('solution_notes');
        
        // Build a query that only includes columns that exist
        const { rows } = await pool.query(`
          SELECT 
            id, title, description, status, priority, assigned_to AS "assignedTo",
            asset_id AS "assetId", reported_date AS "reportedDate", due_date AS "dueDate",
            completed_date AS "completedDate", 
            ${hasPartsRequired ? 'parts_required AS "partsRequired",' : "'[]' AS \"partsRequired\","} 
            ${hasProblemDetails ? 'problem_details AS "problemDetails",' : "'' AS \"problemDetails\","} 
            ${hasSolutionNotes ? 'solution_notes AS "solutionNotes",' : "'' AS \"solutionNotes\","} 
            created_by AS "createdBy",
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
        
        // Get available columns to handle different schemas
        const tableInfo = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'work_orders'
        `);
        
        const availableColumns = tableInfo.rows.map(row => row.column_name);
        
        // Build update fields and values
        Object.keys(updateData).forEach(key => {
          // Skip affectsAssetStatus if it might not exist in Docker
          if (key === 'affectsAssetStatus') return;
          
          // Convert camelCase to snake_case for SQL
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          
          // Skip fields that don't exist in this schema
          if (!availableColumns.includes(snakeKey)) {
            console.log(`Skipping field '${key}' (${snakeKey}) as it does not exist in work_orders table`);
            return;
          }
          
          fields.push(`${snakeKey} = $${paramIndex}`);
          
          // Format dates for SQL
          if (updateData[key as keyof typeof updateData] instanceof Date) {
            values.push((updateData[key as keyof typeof updateData] as Date).toISOString());
          } else {
            values.push(updateData[key as keyof typeof updateData]);
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
        
        // Reuse the columns we checked earlier
        const hasPartsRequired = availableColumns.includes('parts_required');
        const hasProblemDetails = availableColumns.includes('problem_details');
        const hasSolutionNotes = availableColumns.includes('solution_notes');
        
        // Format response to match expected WorkOrder type with schema compatibility
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
          partsRequired: hasPartsRequired ? rows[0].parts_required : [],
          problemDetails: hasProblemDetails ? rows[0].problem_details : '',
          solutionNotes: hasSolutionNotes ? rows[0].solution_notes : '',
          createdBy: rows[0].created_by
        };
        
        // If we're completing a work order and using the raw query approach,
        // check for related problem events to mark as resolved
        if (isCompletingWorkOrder) {
          try {
            // Find any problem events that reference this work order
            const relatedProblemEvents = await db
              .select()
              .from(problemEvents)
              .where(eq(problemEvents.workOrderId, id));
              
            // If this work order is linked to problem events, resolve them too
            for (const event of relatedProblemEvents) {
              if (!event.resolved) {
                console.log(`Automatically resolving problem event ${event.id} because work order ${id} was completed`);
                await this.resolveProblemEvent(event.id, result.assignedTo || event.userId);
              }
            }
          } catch (eventError) {
            console.error("Error handling related problem events:", eventError);
            // Continue despite errors with problem events
          }
        }
        
        // Return the result from our raw query
        return result;
      }
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
    try {
      // Check columns to detect environment differences
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'assets'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log('Available columns in assets table:', columns);
      
      // Check for Docker environment based on different column names or behavior
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                              || process.env.RUNNING_IN_DOCKER === 'true';
      
      console.log(`Running in Docker environment: ${isRunningInDocker}`);
      
      if (isRunningInDocker) {
        console.log('Docker schema detected for assets table - using custom insertion');
        
        // Sanitize the asset data for Docker environment
        const sanitizedAsset = { ...asset };
        
        // Make sure description is never null or undefined
        if (sanitizedAsset.description === null || sanitizedAsset.description === undefined) {
          sanitizedAsset.description = ''; // Always ensure description has at least an empty string
        }
        
        // Clean up any potential null fields that might cause problems
        Object.keys(sanitizedAsset).forEach(key => {
          if (sanitizedAsset[key] === null || sanitizedAsset[key] === undefined || sanitizedAsset[key] === '') {
            if (typeof sanitizedAsset[key] === 'string') {
              sanitizedAsset[key] = ''; // Replace null/undefined strings with empty string
            } else if (key !== 'commissionedDate' && key !== 'lastMaintenance') {
              delete sanitizedAsset[key]; // Remove other null/undefined fields (except dates)
            }
          }
        });
        
        console.log('Sanitized asset data for Docker:', sanitizedAsset);
        
        // Build field list for query
        const fieldNames = Object.keys(sanitizedAsset)
          .map(key => {
            // Convert camelCase to snake_case for database columns
            return key.replace(/([A-Z])/g, '_$1').toLowerCase();
          })
          .filter(field => columns.includes(field)); // Only include fields that exist in the table
          
        // Build values list
        const values = fieldNames.map(field => {
          // Convert snake_case back to camelCase for object keys
          const camelKey = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          return sanitizedAsset[camelKey];
        });
        
        // Build placeholders for prepared statement
        const placeholders = fieldNames.map((_, index) => `$${index + 1}`);
        
        // Build the query
        const query = `
          INSERT INTO assets (${fieldNames.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING *
        `;
        
        console.log('Executing Docker-specific asset creation query:', query);
        console.log('With values:', values);
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
          throw new Error('Failed to create asset in Docker environment');
        }
        
        // Convert snake_case column names to camelCase for the returned asset
        const newAsset = {};
        Object.keys(result.rows[0]).forEach(key => {
          const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          newAsset[camelKey] = result.rows[0][key];
        });
        
        console.log('Successfully created asset in Docker environment');
        return newAsset as Asset;
      } else {
        // Regular environment - use ORM
        const [newAsset] = await db.insert(assets).values(asset).returning();
        return newAsset;
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
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
    try {
      // Check if we're in Docker environment - check columns to detect environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'maintenance_change_logs'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      const isDockerEnvironment = !columns.includes('field_name');
      
      if (isDockerEnvironment) {
        console.log('Docker schema detected for maintenance_change_logs - missing field_name column');
        
        // Build a dynamic query based on actual available columns
        let query = `
          INSERT INTO maintenance_change_logs (
            schedule_id, 
            changed_by, 
            change_type, 
            ${columns.includes('new_value') ? 'new_value' : ''}
          ) VALUES (
            $1, 
            $2, 
            $3, 
            ${columns.includes('new_value') ? '$4' : ''}
          ) RETURNING id, schedule_id, changed_by, changed_at, change_type
        `;
        
        // Remove trailing commas if needed
        query = query.replace(/, \)/, ' )').replace(/, \$4\)/, ' )');
        
        console.log('Executing Docker-compatible maintenance change log query:', query);
        
        const params = [
          log.scheduleId,
          log.changedBy,
          log.changeType
        ];
        
        if (columns.includes('new_value')) {
          params.push(log.newValue || '');
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
          throw new Error('Failed to create maintenance change log');
        }
        
        // Return a compatible object
        return {
          id: result.rows[0].id,
          scheduleId: result.rows[0].schedule_id,
          changedBy: result.rows[0].changed_by,
          changedAt: result.rows[0].changed_at,
          changeType: result.rows[0].change_type,
          fieldName: null, // Field doesn't exist in Docker
          oldValue: null,  // May not exist in Docker
          newValue: null,  // May not exist in Docker
          notes: null      // May not exist in Docker
        };
      } else {
        // Regular environment - use ORM
        const [newLog] = await db.insert(maintenanceChangeLogs).values(log).returning();
        return newLog;
      }
    } catch (error) {
      console.error('Error creating maintenance change log:', error);
      
      // Return a minimal valid object to prevent further errors
      return {
        id: 0,
        scheduleId: log.scheduleId,
        changedBy: log.changedBy,
        changedAt: new Date(),
        changeType: log.changeType,
        fieldName: null,
        oldValue: null,
        newValue: null,
        notes: null
      };
    }
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
    try {
      // Check columns to detect environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'settings'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log('Available columns in settings table:', columns);
      
      // Check for Docker environment based on different column names
      const isDockerEnvironment = !columns.includes('work_week_start') && 
                                 columns.includes('maintenance_due_reminder');
                                 
      if (isDockerEnvironment) {
        console.log('Docker schema detected for settings table');
        
        // Build a dynamic query based on actual available columns
        let query = `SELECT id`;
        
        if (columns.includes('time_zone')) query += `, time_zone as "timeZone"`;
        if (columns.includes('date_format')) query += `, date_format as "dateFormat"`;
        if (columns.includes('time_format')) query += `, time_format as "timeFormat"`;
        if (columns.includes('email_notifications')) query += `, email_notifications as "emailNotifications"`;
        if (columns.includes('maintenance_due_reminder')) query += `, maintenance_due_reminder as "maintenanceDueReminder"`;
        if (columns.includes('critical_alerts_only')) query += `, critical_alerts_only as "criticalAlertsOnly"`;
        if (columns.includes('theme')) query += `, theme`;
        if (columns.includes('accent_color')) query += `, accent_color as "accentColor"`;
        if (columns.includes('company_name')) query += `, company_name as "companyName"`;
        if (columns.includes('company_logo')) query += `, company_logo as "companyLogo"`;
        if (columns.includes('default_priority')) query += `, default_priority as "defaultPriority"`;
        if (columns.includes('default_asset_id')) query += `, default_asset_id as "defaultAssetId"`;
        if (columns.includes('default_assigned_to')) query += `, default_assigned_to as "defaultAssignedTo"`;
        if (columns.includes('notify_maintenance')) query += `, notify_maintenance as "notifyMaintenance"`;
        if (columns.includes('skip_details_form')) query += `, skip_details_form as "skipDetailsForm"`;
        
        query += ` FROM settings ORDER BY id DESC LIMIT 1`;
        
        console.log('Executing Docker settings query:', query);
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
          // Create default settings
          return this.updateSettings({
            workWeekStart: 1, // Monday
            workWeekEnd: 5,   // Friday
            workDayStart: '09:00',
            workDayEnd: '17:00',
            timeZone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
            emailNotifications: true,
            maintenanceDueReminder: 7, // days
            criticalAlertsOnly: false,
            theme: 'light',
            accentColor: '#3b82f6',
            companyName: 'CMMS',
            companyLogo: null,
            holidayCalendar: [],
            roleDefaultPages: {},
          });
        }
        
        // Add default values for missing fields in Docker environment
        const settings = {
          ...result.rows[0],
          workWeekStart: 1, // Monday
          workWeekEnd: 5,   // Friday
          workDayStart: '09:00',
          workDayEnd: '17:00',
          holidayCalendar: [],
          roleDefaultPages: {},
          companyLogo: result.rows[0].companyLogo || null,
          updatedAt: new Date()
        };
        
        return settings;
      } else {
        // Regular environment - use ORM
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
    } catch (error) {
      console.error('Error getting settings:', error);
      
      // Return default settings as a last resort
      return {
        id: 1,
        workWeekStart: 1, // Monday
        workWeekEnd: 5,   // Friday
        workDayStart: '09:00',
        workDayEnd: '17:00',
        timeZone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm',
        emailNotifications: true,
        maintenanceDueReminder: 7, // days
        criticalAlertsOnly: false,
        theme: 'light',
        accentColor: '#3b82f6',
        companyName: 'CMMS',
        companyLogo: null,
        holidayCalendar: [],
        roleDefaultPages: {},
        updatedAt: new Date()
      };
    }
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    try {
      // Get current settings record
      const existingSettings = await this.getSettings();
      
      // Check columns to detect environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'settings'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      
      // Check for Docker environment based on different column names
      const isDockerEnvironment = !columns.includes('work_week_start') && 
                                 columns.includes('maintenance_due_reminder');
      
      if (isDockerEnvironment) {
        console.log('Docker schema detected for updateSettings');
        
        // Create a docker-specific update query
        const updateFields = [];
        const values = [];
        let paramCounter = 1;
        
        // Map standard fields to Docker column names
        if (updates.timeZone !== undefined) {
          updateFields.push(`time_zone = $${paramCounter}`);
          values.push(updates.timeZone);
          paramCounter++;
        }
        
        if (updates.dateFormat !== undefined) {
          updateFields.push(`date_format = $${paramCounter}`);
          values.push(updates.dateFormat);
          paramCounter++;
        }
        
        if (updates.timeFormat !== undefined) {
          updateFields.push(`time_format = $${paramCounter}`);
          values.push(updates.timeFormat);
          paramCounter++;
        }
        
        if (updates.emailNotifications !== undefined) {
          updateFields.push(`email_notifications = $${paramCounter}`);
          values.push(updates.emailNotifications);
          paramCounter++;
        }
        
        if (updates.maintenanceDueReminder !== undefined) {
          updateFields.push(`maintenance_due_reminder = $${paramCounter}`);
          values.push(updates.maintenanceDueReminder);
          paramCounter++;
        }
        
        if (updates.criticalAlertsOnly !== undefined) {
          updateFields.push(`critical_alerts_only = $${paramCounter}`);
          values.push(updates.criticalAlertsOnly);
          paramCounter++;
        }
        
        if (updates.theme !== undefined) {
          updateFields.push(`theme = $${paramCounter}`);
          values.push(updates.theme);
          paramCounter++;
        }
        
        if (updates.accentColor !== undefined) {
          updateFields.push(`accent_color = $${paramCounter}`);
          values.push(updates.accentColor);
          paramCounter++;
        }
        
        if (updates.companyName !== undefined) {
          updateFields.push(`company_name = $${paramCounter}`);
          values.push(updates.companyName);
          paramCounter++;
        }
        
        if (updates.companyLogo !== undefined) {
          updateFields.push(`company_logo = $${paramCounter}`);
          values.push(updates.companyLogo);
          paramCounter++;
        }
        
        // Execute the update query if there are fields to update
        if (updateFields.length > 0) {
          values.push(existingSettings.id);
          const query = `
            UPDATE settings 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING *
          `;
          
          console.log('Executing Docker-specific settings update query:', query);
          const result = await pool.query(query, values);
          
          if (result.rows.length > 0) {
            // Return updated settings with the Docker schema
            const updatedSettings = {
              ...existingSettings,
              ...updates,
              timeZone: updates.timeZone || existingSettings.timeZone,
              dateFormat: updates.dateFormat || existingSettings.dateFormat,
              timeFormat: updates.timeFormat || existingSettings.timeFormat,
              emailNotifications: updates.emailNotifications !== undefined 
                ? updates.emailNotifications 
                : existingSettings.emailNotifications,
              maintenanceDueReminder: updates.maintenanceDueReminder || existingSettings.maintenanceDueReminder,
              criticalAlertsOnly: updates.criticalAlertsOnly !== undefined 
                ? updates.criticalAlertsOnly 
                : existingSettings.criticalAlertsOnly,
              theme: updates.theme || existingSettings.theme,
              accentColor: updates.accentColor || existingSettings.accentColor,
              companyName: updates.companyName || existingSettings.companyName,
              companyLogo: updates.companyLogo !== undefined 
                ? updates.companyLogo 
                : existingSettings.companyLogo,
            };
            
            return updatedSettings;
          }
        }
        
        // If no update was performed, return existing settings
        return existingSettings;
      } else {
        // Update using ORM for non-Docker environment
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
    } catch (error) {
      console.error('Error updating settings:', error);
      
      // If all else fails, return the existing settings with updates applied in memory
      const existingSettings = await this.getSettings();
      return {
        ...existingSettings,
        ...updates
      };
    }
  }

  // Problem tracking methods
  async getProblemButtons(): Promise<ProblemButton[]> {
    try {
      // Skip ORM approach entirely - we know it will fail in Docker
      // Instead check for Docker environment by checking for 'creates_work_order' column
      // which is only present in Docker
      
      const isInDocker = process.env.IN_DOCKER === "true";
      console.log('Running in Docker environment:', isInDocker);
      
      // Directly check the database structure
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'problem_buttons'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log('Available columns in problem_buttons table:', columns);
      
      // Check if we're in Docker environment based on schema differences
      const hasCreatesWorkOrder = columns.includes('creates_work_order');
      
      if (hasCreatesWorkOrder) {
        console.log('Docker schema detected with creates_work_order column');
        
        // Build a query with only the columns that we know exist in the Docker schema
        let query = `
          SELECT 
            id, 
            label, 
            color, 
            icon,
            creates_work_order as "createWorkOrder"
        `;
        
        // Check for optional Docker-specific columns
        if (columns.includes('default_notes')) {
          query += `, default_notes as "defaultNotes"`;
        }
        
        if (columns.includes('default_location')) {
          query += `, default_location as "defaultLocation"`;
        }
        
        if (columns.includes('requires_asset')) {
          query += `, requires_asset as "requiresAsset"`;
        }
        
        if (columns.includes('active')) {
          query += `, active`;
        } else {
          query += `, TRUE as active`;
        }
        
        query += ` FROM problem_buttons`;
        
        console.log('Executing ultra-safe Docker query:', query);
        const result = await pool.query(query);
        
        // Transform results to match expected format
        return result.rows.map(row => ({
          id: row.id,
          label: row.label,
          color: row.color || '#6b7280',
          icon: row.icon || null,
          order: 0, // Default value for Docker
          active: row.active === undefined ? true : row.active,
          createWorkOrder: row.createWorkOrder === undefined ? false : row.createWorkOrder,
          workOrderTitle: row.workOrderTitle || null,
          workOrderDescription: row.workOrderDescription || null,
          workOrderPriority: row.workOrderPriority || 'HIGH',
          defaultAssetId: row.defaultAssetId || null,
          defaultAssignedTo: row.defaultAssignedTo || null,
          notifyMaintenance: false, // Default for Docker
          skipDetailsForm: false,   // Default for Docker
          createdAt: new Date(),    // Default when not found in DB
          updatedAt: new Date()     // Default when not found in DB
        }));
      } else {
        // Not in Docker, try ORM approach
        try {
          const result = await db
            .select()
            .from(problemButtons)
            .orderBy(asc(problemButtons.order));
          return result;
        } catch (ormError) {
          console.error('Error fetching problem buttons with ORM:', ormError);
          
          // If ORM fails, use a simple query based on available columns
          let query = `SELECT id, label, color`;
          
          // Add optional columns if they exist
          if (columns.includes('icon')) query += `, icon`;
          if (columns.includes('order')) query += `, "order"`;
          if (columns.includes('active')) query += `, active`;
          if (columns.includes('create_work_order')) query += `, create_work_order as "createWorkOrder"`;
          if (columns.includes('work_order_title')) query += `, work_order_title as "workOrderTitle"`;
          if (columns.includes('work_order_description')) query += `, work_order_description as "workOrderDescription"`;
          if (columns.includes('work_order_priority')) query += `, work_order_priority as "workOrderPriority"`;
          if (columns.includes('default_asset_id')) query += `, default_asset_id as "defaultAssetId"`;
          if (columns.includes('default_assigned_to')) query += `, default_assigned_to as "defaultAssignedTo"`;
          if (columns.includes('notify_maintenance')) query += `, notify_maintenance as "notifyMaintenance"`;
          if (columns.includes('skip_details_form')) query += `, skip_details_form as "skipDetailsForm"`;
          
          query += ` FROM problem_buttons`;
          
          // Add ORDER BY only if the column exists
          if (columns.includes('order')) {
            query += ` ORDER BY "order" ASC`;
          }
          
          console.log('Executing non-Docker fallback query:', query);
          const result = await pool.query(query);
          
          return result.rows.map(row => ({
            id: row.id,
            label: row.label,
            color: row.color || '#6b7280',
            icon: row.icon || null,
            order: row.order || 0,
            active: row.active === undefined ? true : row.active,
            createWorkOrder: row.createWorkOrder === undefined ? false : row.createWorkOrder,
            workOrderTitle: row.workOrderTitle || null,
            workOrderDescription: row.workOrderDescription || null,
            workOrderPriority: row.workOrderPriority || 'HIGH',
            defaultAssetId: row.defaultAssetId || null,
            defaultAssignedTo: row.defaultAssignedTo || null,
            notifyMaintenance: row.notifyMaintenance === undefined ? false : row.notifyMaintenance,
            skipDetailsForm: row.skipDetailsForm === undefined ? false : row.skipDetailsForm,
            createdAt: new Date(), // Default when not found in DB
            updatedAt: new Date()  // Default when not found in DB
          }));
        }
      }
    } catch (error) {
      console.error('All approaches to fetch problem buttons failed:', error);
      
      // Last resort fallback - return empty array
      console.log('Returning empty problem buttons array as last resort fallback');
      return [];
    }
  }

  async getProblemButton(id: number): Promise<ProblemButton | undefined> {
    try {
      // Check for Docker environment
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                              || process.env.RUNNING_IN_DOCKER === 'true';
                              
      // Check the columns to determine environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'problem_buttons'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log(`Available columns in problem_buttons table for button ${id}:`, columns);
      
      // Check if we're in Docker environment based on schema differences
      const hasCreatesWorkOrder = columns.includes('creates_work_order');
      const inDockerEnvironment = isRunningInDocker || hasCreatesWorkOrder;
      
      console.log(`Getting problem button ${id} - Docker environment: ${inDockerEnvironment}`);
      
      if (inDockerEnvironment) {
        console.log('Using Docker-specific approach for getting problem button');
        
        // Build a query that adapts to the Docker schema
        let query = `
          SELECT 
            id, 
            label, 
            color, 
            icon
        `;
        
        // Handle Docker's different column name for create_work_order
        if (hasCreatesWorkOrder) {
          query += `, creates_work_order as "createWorkOrder"`;
        } else if (columns.includes('create_work_order')) {
          query += `, create_work_order as "createWorkOrder"`;
        }
        
        // Check for optional Docker-specific columns
        if (columns.includes('default_notes')) {
          query += `, default_notes as "defaultNotes"`;
        }
        
        if (columns.includes('default_location')) {
          query += `, default_location as "defaultLocation"`;
        }
        
        if (columns.includes('requires_asset')) {
          query += `, requires_asset as "requiresAsset"`;
        }
        
        if (columns.includes('work_order_title')) {
          query += `, work_order_title as "workOrderTitle"`;
        }
        
        if (columns.includes('work_order_description')) {
          query += `, work_order_description as "workOrderDescription"`;
        }
        
        if (columns.includes('work_order_priority')) {
          query += `, work_order_priority as "workOrderPriority"`;
        }
        
        if (columns.includes('default_asset_id')) {
          query += `, default_asset_id as "defaultAssetId"`;
        }
        
        if (columns.includes('default_assigned_to')) {
          query += `, default_assigned_to as "defaultAssignedTo"`;
        }
        
        if (columns.includes('active')) {
          query += `, active`;
        } else {
          query += `, TRUE as active`;
        }
        
        if (columns.includes('order')) {
          query += `, "order"`;
        }
        
        query += ` FROM problem_buttons WHERE id = $1`;
        
        console.log(`Executing Docker-compatible query for button ${id}:`, query);
        
        try {
          const result = await pool.query(query, [id]);
          
          if (result.rows.length === 0) {
            console.log(`Problem button with ID ${id} not found in Docker environment`);
            return undefined;
          }
          
          const row = result.rows[0];
          
          // Return a fully populated object for Docker schema with defaults for missing fields
          const button: ProblemButton = {
            id: row.id,
            label: row.label,
            color: row.color || '#6b7280',
            icon: row.icon || null,
            order: row.order !== undefined ? row.order : 0,
            active: row.active !== undefined ? row.active : true,
            createWorkOrder: row.createWorkOrder !== undefined ? row.createWorkOrder : false,
            workOrderTitle: row.workOrderTitle || null,
            workOrderDescription: row.workOrderDescription || null,
            workOrderPriority: row.workOrderPriority || 'HIGH',
            defaultAssetId: row.defaultAssetId || null,
            defaultAssignedTo: row.defaultAssignedTo || null,
            notifyMaintenance: row.notifyMaintenance !== undefined ? row.notifyMaintenance : false,
            skipDetailsForm: row.skipDetailsForm !== undefined ? row.skipDetailsForm : false,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
          };
          
          console.log(`Successfully retrieved problem button from Docker:`, button);
          return button;
        } catch (dockerError) {
          console.error(`Error executing Docker-compatible query:`, dockerError);
          
          // Fall back to a simpler query if the first one fails
          try {
            console.log(`Trying simplified Docker fallback query for button ${id}`);
            const result = await pool.query(`SELECT id, label, color, icon FROM problem_buttons WHERE id = $1`, [id]);
            
            if (result.rows.length === 0) {
              return undefined;
            }
            
            // Return a minimal populated object with defaults
            return {
              id: result.rows[0].id,
              label: result.rows[0].label,
              color: result.rows[0].color || '#6b7280',
              icon: result.rows[0].icon || null,
              order: 0,
              active: true,
              createWorkOrder: false,
              workOrderTitle: null,
              workOrderDescription: null,
              workOrderPriority: 'HIGH',
              defaultAssetId: null,
              defaultAssignedTo: null,
              notifyMaintenance: false,
              skipDetailsForm: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          } catch (simplifiedError) {
            console.error(`Even simplified Docker query failed:`, simplifiedError);
            return undefined;
          }
        }
      } else {
        console.log('Using standard ORM approach for getting problem button');
        
        // Not in Docker, try ORM approach first
        try {
          const [button] = await db
            .select()
            .from(problemButtons)
            .where(eq(problemButtons.id, id));
          
          if (!button) {
            console.log(`Problem button with ID ${id} not found with ORM`);
            return undefined;
          }
          
          return button;
        } catch (ormError) {
          console.error(`Error fetching problem button ${id} with ORM:`, ormError);
          
          try {
            // Create a simple query based on available columns
            let query = `SELECT id, label, color`;
            
            // Add optional columns if they exist
            if (columns.includes('icon')) query += `, icon`;
            if (columns.includes('order')) query += `, "order"`;
            if (columns.includes('active')) query += `, active`;
            if (columns.includes('create_work_order')) query += `, create_work_order as "createWorkOrder"`;
            if (columns.includes('work_order_title')) query += `, work_order_title as "workOrderTitle"`;
            if (columns.includes('work_order_description')) query += `, work_order_description as "workOrderDescription"`;
            if (columns.includes('work_order_priority')) query += `, work_order_priority as "workOrderPriority"`;
            if (columns.includes('default_asset_id')) query += `, default_asset_id as "defaultAssetId"`;
            if (columns.includes('default_assigned_to')) query += `, default_assigned_to as "defaultAssignedTo"`;
            if (columns.includes('notify_maintenance')) query += `, notify_maintenance as "notifyMaintenance"`;
            if (columns.includes('skip_details_form')) query += `, skip_details_form as "skipDetailsForm"`;
            
            query += ` FROM problem_buttons WHERE id = $1`;
            
            console.log(`Executing fallback query for standard environment button ${id}:`, query);
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
              return undefined;
            }
            
            const row = result.rows[0];
            
            // Return a fully populated object with defaults for missing fields
            return {
              id: row.id,
              label: row.label,
              color: row.color || '#6b7280',
              icon: row.icon || null,
              order: row.order !== undefined ? row.order : 0,
              active: row.active !== undefined ? row.active : true,
              createWorkOrder: row.createWorkOrder !== undefined ? row.createWorkOrder : false,
              workOrderTitle: row.workOrderTitle || null,
              workOrderDescription: row.workOrderDescription || null,
              workOrderPriority: row.workOrderPriority || 'HIGH',
              defaultAssetId: row.defaultAssetId || null,
              defaultAssignedTo: row.defaultAssignedTo || null,
              notifyMaintenance: row.notifyMaintenance !== undefined ? row.notifyMaintenance : false,
              skipDetailsForm: row.skipDetailsForm !== undefined ? row.skipDetailsForm : false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          } catch (fallbackError) {
            console.error(`Fallback query for problem button ${id} also failed:`, fallbackError);
            
            // Simplest query as last resort
            try {
              console.log(`Trying ultra-simplified query as last resort for button ${id}`);
              const result = await pool.query(`SELECT id, label, color FROM problem_buttons WHERE id = $1`, [id]);
              
              if (result.rows.length === 0) {
                return undefined;
              }
              
              // Return a minimal populated object with defaults
              return {
                id: result.rows[0].id,
                label: result.rows[0].label,
                color: result.rows[0].color || '#6b7280',
                icon: null,
                order: 0,
                active: true,
                createWorkOrder: false,
                workOrderTitle: null,
                workOrderDescription: null,
                workOrderPriority: 'HIGH',
                defaultAssetId: null,
                defaultAssignedTo: null,
                notifyMaintenance: false,
                skipDetailsForm: false,
                createdAt: new Date(),
                updatedAt: new Date()
              };
            } catch (lastError) {
              console.error(`All attempts to get problem button ${id} failed:`, lastError);
              return undefined;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Critical error in getProblemButton(${id}):`, error);
      return undefined;
    }
  }

  async createProblemButton(button: InsertProblemButton): Promise<ProblemButton> {
    try {
      // Get the current highest order value
      const buttons = await this.getProblemButtons();
      const highestOrder = buttons.length > 0 
        ? Math.max(...buttons.map(b => b.order || 0))
        : -1;
        
      // Check for Docker environment
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                               || process.env.RUNNING_IN_DOCKER === 'true';
      
      // Check database schema to detect Docker environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'problem_buttons'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      console.log('Available columns in problem_buttons table for creation:', columns);
      
      // Check if we're in Docker environment based on schema differences
      const hasCreatesWorkOrder = columns.includes('creates_work_order');
      const hasCreateWorkOrder = columns.includes('create_work_order');
      const inDockerEnvironment = isRunningInDocker || hasCreatesWorkOrder;
      
      console.log(`Creating problem button - Docker environment: ${inDockerEnvironment}`);
      console.log('Problem button data:', button);
      
      if (inDockerEnvironment) {
        console.log('Using Docker-specific approach for creating problem button');
        
        // Sanitize input for Docker environment
        const sanitizedButton: Record<string, any> = {
          label: button.label,
          color: button.color || '#6b7280',
          icon: button.icon || null
        };
        
        // Map fields to their Docker-specific column names
        if (hasCreatesWorkOrder && 'createWorkOrder' in button) {
          sanitizedButton.creates_work_order = button.createWorkOrder;
        } else if (hasCreateWorkOrder && 'createWorkOrder' in button) {
          sanitizedButton.create_work_order = button.createWorkOrder;
        }
        
        // Optionally add these fields if they exist in the schema
        if (columns.includes('work_order_title') && button.workOrderTitle) {
          sanitizedButton.work_order_title = button.workOrderTitle;
        }
        
        if (columns.includes('work_order_description') && button.workOrderDescription) {
          sanitizedButton.work_order_description = button.workOrderDescription;
        }
        
        if (columns.includes('default_asset_id') && button.defaultAssetId) {
          sanitizedButton.default_asset_id = button.defaultAssetId;
        }
        
        if (columns.includes('order')) {
          sanitizedButton.order = button.order || highestOrder + 1;
        }
        
        if (columns.includes('active')) {
          sanitizedButton.active = button.active !== undefined ? button.active : true;
        }
        
        // Build field list and placeholders for prepared statement
        const fieldNames = Object.keys(sanitizedButton);
        const placeholders = fieldNames.map((_, index) => `$${index + 1}`);
        const values = Object.values(sanitizedButton);
        
        // Build the query
        const query = `
          INSERT INTO problem_buttons (${fieldNames.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING *
        `;
        
        console.log('Executing Docker-specific problem button creation query:', query);
        console.log('With values:', values);
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
          throw new Error('Failed to create problem button in Docker environment');
        }
        
        // Transform the result to match our expected schema
        const row = result.rows[0];
        const newButton: ProblemButton = {
          id: row.id,
          label: row.label,
          color: row.color || '#6b7280',
          icon: row.icon || null,
          order: row.order || 0,
          active: row.active === undefined ? true : row.active,
          createWorkOrder: (row.creates_work_order || row.create_work_order) || false,
          workOrderTitle: row.work_order_title || null,
          workOrderDescription: row.work_order_description || null,
          workOrderPriority: row.work_order_priority || 'HIGH',
          defaultAssetId: row.default_asset_id || null,
          defaultAssignedTo: row.default_assigned_to || null,
          notifyMaintenance: row.notify_maintenance || false,
          skipDetailsForm: row.skip_details_form || false,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        };
        
        console.log('Successfully created problem button in Docker:', newButton);
        return newButton;
      } else {
        // Standard environment, use ORM
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
    } catch (error) {
      console.error('Error creating problem button:', error);
      throw error;
    }
  }

  async updateProblemButton(id: number, updates: Partial<ProblemButton>): Promise<ProblemButton> {
    try {
      // Check for Docker environment
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                               || process.env.RUNNING_IN_DOCKER === 'true';
      
      // Check database schema to detect Docker environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'problem_buttons'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      
      // Check if we're in Docker environment based on schema differences
      const hasCreatesWorkOrder = columns.includes('creates_work_order');
      const inDockerEnvironment = isRunningInDocker || hasCreatesWorkOrder;
      
      console.log(`Updating problem button ${id} - Docker environment: ${inDockerEnvironment}`);
      console.log('Problem button updates:', updates);
      
      if (inDockerEnvironment) {
        console.log('Using Docker-specific approach for updating problem button');
        
        // First get the current button to make sure it exists
        const buttonResult = await pool.query(`
          SELECT * FROM problem_buttons WHERE id = $1
        `, [id]);
        
        if (buttonResult.rows.length === 0) {
          throw new Error(`Problem button with ID ${id} not found`);
        }
        
        // Sanitize updates for Docker environment
        const sanitizedUpdates: Record<string, any> = {};
        
        // Only add fields that exist in the Docker schema
        if ('label' in updates) sanitizedUpdates.label = updates.label;
        if ('color' in updates) sanitizedUpdates.color = updates.color;
        if ('icon' in updates) sanitizedUpdates.icon = updates.icon;
        
        // Map fields to their Docker-specific column names
        if (hasCreatesWorkOrder && 'createWorkOrder' in updates) {
          sanitizedUpdates.creates_work_order = updates.createWorkOrder;
        } else if (columns.includes('create_work_order') && 'createWorkOrder' in updates) {
          sanitizedUpdates.create_work_order = updates.createWorkOrder;
        }
        
        // Optionally update these fields if they exist in the schema
        if (columns.includes('work_order_title') && 'workOrderTitle' in updates) {
          sanitizedUpdates.work_order_title = updates.workOrderTitle;
        }
        
        if (columns.includes('work_order_description') && 'workOrderDescription' in updates) {
          sanitizedUpdates.work_order_description = updates.workOrderDescription;
        }
        
        if (columns.includes('default_asset_id') && 'defaultAssetId' in updates) {
          sanitizedUpdates.default_asset_id = updates.defaultAssetId;
        }
        
        if (columns.includes('order') && 'order' in updates) {
          sanitizedUpdates.order = updates.order;
        }
        
        if (columns.includes('active') && 'active' in updates) {
          sanitizedUpdates.active = updates.active;
        }
        
        // If there's nothing to update, just return the current button
        if (Object.keys(sanitizedUpdates).length === 0) {
          return await this.getProblemButton(id) as ProblemButton;
        }
        
        // Build the SET clause for the update query
        const setClause = Object.keys(sanitizedUpdates).map((key, index) => 
          `${key} = $${index + 2}`
        ).join(', ');
        
        // Build and execute the update query
        const query = `
          UPDATE problem_buttons
          SET ${setClause}
          WHERE id = $1
          RETURNING *
        `;
        
        const values = [id, ...Object.values(sanitizedUpdates)];
        
        console.log('Executing Docker-specific problem button update query:', query);
        console.log('With values:', values);
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
          throw new Error(`Failed to update problem button with ID ${id}`);
        }
        
        // Transform the result to match our expected schema
        const row = result.rows[0];
        const updatedButton: ProblemButton = {
          id: row.id,
          label: row.label,
          color: row.color || '#6b7280',
          icon: row.icon || null,
          order: row.order || 0,
          active: row.active === undefined ? true : row.active,
          createWorkOrder: (row.creates_work_order || row.create_work_order) || false,
          workOrderTitle: row.work_order_title || null,
          workOrderDescription: row.work_order_description || null,
          workOrderPriority: row.work_order_priority || 'HIGH',
          defaultAssetId: row.default_asset_id || null,
          defaultAssignedTo: row.default_assigned_to || null,
          notifyMaintenance: row.notify_maintenance || false,
          skipDetailsForm: row.skip_details_form || false,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        };
        
        console.log('Successfully updated problem button in Docker:', updatedButton);
        return updatedButton;
      } else {
        // Standard environment, use ORM
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
    } catch (error) {
      console.error('Error updating problem button:', error);
      throw error;
    }
  }

  async deleteProblemButton(id: number): Promise<void> {
    try {
      // Check for Docker environment
      const isRunningInDocker = process.env.IS_DOCKER === 'true' || process.env.DOCKER_ENV === 'true'
                              || process.env.RUNNING_IN_DOCKER === 'true';
      
      // Check database schema to detect Docker environment
      const tableInfo = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'problem_buttons'
      `);
      
      const columns = tableInfo.rows.map(row => row.column_name);
      
      // Check if we're in Docker environment based on schema differences
      const hasCreatesWorkOrder = columns.includes('creates_work_order');
      const inDockerEnvironment = isRunningInDocker || hasCreatesWorkOrder;
      
      console.log(`Deleting problem button ${id} - Docker environment: ${inDockerEnvironment}`);
      
      if (inDockerEnvironment) {
        console.log('Using Docker-specific approach for deleting problem button');
        
        // First check if the button exists
        const buttonResult = await pool.query(`
          SELECT * FROM problem_buttons WHERE id = $1
        `, [id]);
        
        if (buttonResult.rows.length === 0) {
          console.log(`Problem button with ID ${id} not found, nothing to delete`);
          return;
        }
        
        // Execute direct SQL delete
        await pool.query(`DELETE FROM problem_buttons WHERE id = $1`, [id]);
        console.log(`Successfully deleted problem button with ID ${id} in Docker environment`);
      } else {
        // Standard environment, use ORM
        await db.delete(problemButtons).where(eq(problemButtons.id, id));
      }
    } catch (error) {
      console.error('Error deleting problem button:', error);
      throw error;
    }
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