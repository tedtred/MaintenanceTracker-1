import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
} as const;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  approved: boolean("approved").notNull().default(false)
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  role: z.literal(UserRole.TECHNICIAN), // Default role for new users
  approved: z.literal(false), // Always start as unapproved
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
  reportedDate: timestamp("reported_date").notNull().defaultNow(),
  completedDate: timestamp("completed_date"),
});

export const insertWorkOrderSchema = createInsertSchema(workOrders)
  .omit({ id: true })
  .extend({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    status: z.string().min(1, "Status is required"),
    priority: z.string().min(1, "Priority is required"),
    assignedTo: z.number().nullable(),
    assetId: z.number().nullable(),
    reportedDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    completedDate: z.string().or(z.date()).nullable().transform((val) =>
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
  });

// Assets schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  Asset_NO: text("Asset_NO").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull(),
  category: text("category").notNull(),
  modelNumber: text("model_number"),
  serialNumber: text("serial_number"),
  manufacturer: text("manufacturer"),
  commissionedDate: timestamp("commissioned_date"), // Changed from purchaseDate
  lastMaintenance: timestamp("last_maintenance")
});

export const insertAssetSchema = createInsertSchema(assets)
  .omit({ id: true })
  .extend({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().min(1, "Location is required"),
    status: z.string().min(1, "Status is required"),
    category: z.string().min(1, "Category is required"),
    modelNumber: z.string().optional(),
    serialNumber: z.string().optional(),
    manufacturer: z.string().optional(),
    commissionedDate: z.string().or(z.date()).optional().transform((val) => // Changed from purchaseDate
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
  });

// Work Order Attachments schema
export const workOrderAttachments = pgTable("work_order_attachments", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => workOrders.id).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertWorkOrderAttachmentSchema = createInsertSchema(workOrderAttachments)
  .omit({ id: true })
  .extend({
    workOrderId: z.number().min(1, "Work order is required"),
    fileName: z.string().min(1, "File name is required"),
    fileUrl: z.string().min(1, "File URL is required"),
    fileType: z.string().min(1, "File type is required"),
  });


// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
// Add new types for attachments
export type WorkOrderAttachment = typeof workOrderAttachments.$inferSelect;
export type InsertWorkOrderAttachment = z.infer<typeof insertWorkOrderAttachmentSchema>;

// Enums
export const WorkOrderStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED", // Add ARCHIVED status
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
  DECOMMISSIONED: "DECOMMISSIONED",  // Add new status
} as const;


// Maintenance Schedule schema
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  frequency: text("frequency").notNull(),
  lastCompleted: timestamp("last_completed"),
  status: text("status").notNull(),
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules)
  .omit({ id: true })
  .extend({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    assetId: z.number().min(1, "Asset selection is required"),
    startDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    endDate: z.string().or(z.date()).nullable().transform((val) =>
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
    frequency: z.string().min(1, "Frequency is required"),
    status: z.string().min(1, "Status is required"),
  });

// Add new types
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;

// Add new table for completed maintenance dates
export const maintenanceCompletions = pgTable("maintenance_completions", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => maintenanceSchedules.id).notNull(),
  completedDate: timestamp("completed_date").notNull(),
  notes: text("notes"),
});

export const insertMaintenanceCompletionSchema = createInsertSchema(maintenanceCompletions)
  .omit({ id: true })
  .extend({
    scheduleId: z.number().min(1, "Schedule is required"),
    completedDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    notes: z.string().optional(),
  });

// Add new types
export type MaintenanceCompletion = typeof maintenanceCompletions.$inferSelect;
export type InsertMaintenanceCompletion = z.infer<typeof insertMaintenanceCompletionSchema>;

// Add new enums
export const MaintenanceFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  BIANNUAL: "BI_ANNUAL",
  YEARLY: "YEARLY",
  TWO_YEAR: "TWO_YEAR",
} as const;

export const MaintenanceStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE",
} as const;

// Add Asset Category enum
export const AssetCategory = {
  MACHINERY: "MACHINERY",
  VEHICLE: "VEHICLE",
  TOOL: "TOOL",
  COMPUTER: "COMPUTER",
  OTHER: "OTHER",
} as const;

// Add Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  workWeekStart: integer("work_week_start").notNull().default(1), // 1 = Monday
  workWeekEnd: integer("work_week_end").notNull().default(5),     // 5 = Friday
  workDayStart: text("work_day_start").notNull().default("09:00"),
  workDayEnd: text("work_day_end").notNull().default("17:00"),
  timeZone: text("time_zone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("MM/DD/YYYY"),
  timeFormat: text("time_format").notNull().default("HH:mm"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings)
  .omit({ id: true })
  .extend({
    workWeekStart: z.number().min(0).max(6),
    workWeekEnd: z.number().min(0).max(6),
    workDayStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    workDayEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timeZone: z.string(),
    dateFormat: z.string(),
    timeFormat: z.string(),
  });

// Add new types
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Add WeekDay enum for better type safety
export const WeekDay = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;