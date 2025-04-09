import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
} as const;

// Define available pages for permission control
export const AvailablePages = {
  DASHBOARD: "dashboard",
  WORK_ORDERS: "work-orders",
  ASSETS: "assets",
  MAINTENANCE_CALENDAR: "maintenance-calendar",
  MAINTENANCE_ANALYTICS: "maintenance-analytics", 
  PROBLEM_TRACKING: "problem-tracking",
  SETTINGS: "settings",
} as const;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  approved: boolean("approved").notNull().default(false),
  // Store page permissions as a JSON array of page IDs
  pagePermissions: text("page_permissions").default("[]").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  role: z.literal(UserRole.TECHNICIAN), // Default role for new users
  approved: z.literal(false), // Always start as unapproved
  pagePermissions: z.literal("[]"), // No pages by default
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
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  affectsAssetStatus: boolean("affects_asset_status").default(false).notNull(), // New field
  partsRequired: text("parts_required"), // New field for parts tracking
  problemDetails: text("problem_details"), // Detailed description of the problem
  solutionNotes: text("solution_notes"), // Notes about how the problem was resolved
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
    dueDate: z.string().or(z.date()).nullable().transform((val) =>
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
    reportedDate: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    completedDate: z.string().or(z.date()).nullable().transform((val) =>
      val ? (typeof val === 'string' ? new Date(val) : val) : null
    ),
    affectsAssetStatus: z.boolean().default(false),
    partsRequired: z.string().optional(),
    problemDetails: z.string().optional(),
    solutionNotes: z.string().optional(),
    createdBy: z.number().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
  });

// Assets schema
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
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
  WAITING_ON_PARTS: "WAITING_ON_PARTS", // New status
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
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
  affectsAssetStatus: boolean("affects_asset_status").default(false).notNull(), // New field
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
    affectsAssetStatus: z.boolean().default(false),
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
  WAITING_ON_PARTS: "WAITING_ON_PARTS", // New status
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
  // Work Schedule Settings
  workWeekStart: integer("work_week_start").notNull().default(1), // 1 = Monday
  workWeekEnd: integer("work_week_end").notNull().default(5),     // 5 = Friday
  workDayStart: text("work_day_start").notNull().default("09:00"),
  workDayEnd: text("work_day_end").notNull().default("17:00"),
  
  // Date & Time Settings
  timeZone: text("time_zone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("MM/DD/YYYY"),
  timeFormat: text("time_format").notNull().default("HH:mm"),
  
  // Notification Settings
  emailNotifications: boolean("email_notifications").notNull().default(true),
  maintenanceDueReminder: integer("maintenance_due_reminder").notNull().default(1), // Days before due date
  criticalAlertsOnly: boolean("critical_alerts_only").notNull().default(false),
  
  // Theme Settings
  theme: text("theme").notNull().default("system"), // light, dark, system
  accentColor: text("accent_color").notNull().default("#0284c7"), // Default blue
  
  // Company Info
  companyName: text("company_name").default(""),
  companyLogo: text("company_logo").default(""),
  
  // Holiday Calendar
  holidayCalendar: text("holiday_calendar").default("[]"), // JSON array of holiday dates
  
  // System
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings)
  .omit({ id: true })
  .extend({
    // Work Schedule validation
    workWeekStart: z.number().min(0).max(6),
    workWeekEnd: z.number().min(0).max(6),
    workDayStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    workDayEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    
    // Date & Time validation
    timeZone: z.string(),
    dateFormat: z.string(),
    timeFormat: z.string(),
    
    // Notification Settings validation
    emailNotifications: z.boolean().default(true),
    maintenanceDueReminder: z.number().min(0).max(30).default(1),
    criticalAlertsOnly: z.boolean().default(false),
    
    // Theme Settings validation
    theme: z.enum(["light", "dark", "system"]).default("system"),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0284c7"),
    
    // Company Info validation
    companyName: z.string().optional(),
    companyLogo: z.string().optional(),
    
    // Holiday Calendar validation
    holidayCalendar: z.string().default("[]"),
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

// Problem Buttons schema for quick entry
export const problemButtons = pgTable("problem_buttons", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull().default("#6b7280"), // Default gray color
  icon: text("icon"), // Icon name from lucide-react
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  // Work order template fields
  createWorkOrder: boolean("create_work_order").notNull().default(false),
  workOrderTitle: text("work_order_title"),
  workOrderDescription: text("work_order_description"),
  workOrderPriority: text("work_order_priority").default(WorkOrderPriority.HIGH),
  defaultAssetId: integer("default_asset_id").references(() => assets.id),
  defaultAssignedTo: integer("default_assigned_to").references(() => users.id),
  notifyMaintenance: boolean("notify_maintenance").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProblemButtonSchema = createInsertSchema(problemButtons)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    label: z.string().min(1, "Label is required"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
    icon: z.string().optional(),
    order: z.number().int().nonnegative(),
    active: z.boolean().default(true),
    // Work order template fields
    createWorkOrder: z.boolean().default(false),
    workOrderTitle: z.string().optional(),
    workOrderDescription: z.string().optional(),
    workOrderPriority: z.enum([
      WorkOrderPriority.LOW,
      WorkOrderPriority.MEDIUM,
      WorkOrderPriority.HIGH
    ]).default(WorkOrderPriority.HIGH).optional(),
    // Handle defaultAssetId as either null, undefined, or a positive number
    defaultAssetId: z.union([
      z.literal(null),
      z.number().int().positive()
    ]).optional(),
    // Handle defaultAssignedTo as either null, undefined, or a positive number
    defaultAssignedTo: z.union([
      z.literal(null),
      z.number().int().positive()
    ]).optional(),
    notifyMaintenance: z.boolean().default(false),
  });

// Problem Events schema to track reported problems
export const problemEvents = pgTable("problem_events", {
  id: serial("id").primaryKey(),
  buttonId: integer("button_id").references(() => problemButtons.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  notes: text("notes"),
  locationName: text("location_name"),
  assetId: integer("asset_id").references(() => assets.id),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  problemDetails: text("problem_details"), // Detailed description of the problem
  solutionNotes: text("solution_notes"), // Notes about how the problem was resolved
});

export const insertProblemEventSchema = createInsertSchema(problemEvents)
  .omit({ id: true, resolvedAt: true })
  .extend({
    buttonId: z.number().int().positive("Button selection is required"),
    userId: z.number().int().positive(),
    timestamp: z.string().or(z.date()).transform((val) =>
      typeof val === 'string' ? new Date(val) : val
    ),
    notes: z.string().optional(),
    locationName: z.string().optional(),
    // Handle assetId as either null, undefined, or a positive number
    assetId: z.union([
      z.literal(null), 
      z.number().int().positive()
    ]).optional(),
    resolved: z.boolean().default(false),
    resolvedBy: z.number().int().positive().optional(),
    workOrderId: z.number().int().positive().optional(),
    problemDetails: z.string().optional(),
    solutionNotes: z.string().optional(),
  });

// Add new types
export type ProblemButton = typeof problemButtons.$inferSelect;
export type InsertProblemButton = z.infer<typeof insertProblemButtonSchema>;
export type ProblemEvent = typeof problemEvents.$inferSelect;
export type InsertProblemEvent = z.infer<typeof insertProblemEventSchema>;