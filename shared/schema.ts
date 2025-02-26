import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

// Work Order schema
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  assetId: integer("asset_id").references(() => assets.id),
  dueDate: timestamp("due_date").notNull()
});

export const insertWorkOrderSchema = createInsertSchema(workOrders)
  .omit({ id: true })
  .extend({
    dueDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
  });

// Asset schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull(),
  lastMaintenance: timestamp("last_maintenance")
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// Enums
export const WorkOrderStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export const WorkOrderPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export const AssetStatus = {
  OPERATIONAL: "OPERATIONAL",
  MAINTENANCE: "MAINTENANCE",
  OFFLINE: "OFFLINE",
} as const;

export const UserRole = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
} as const;

// Maintenance Schedule schema
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // Remove .notNull()
  frequency: text("frequency").notNull(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  lastCompleted: timestamp("last_completed"),
  status: text("status").notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules)
  .omit({ id: true })
  .extend({
    startDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    endDate: z.string().or(z.date()).nullable().transform((val) =>
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
  });

// Add new types
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;


// Add new enums
export const MaintenanceFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY",
} as const;

export const MaintenanceStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE",
} as const;