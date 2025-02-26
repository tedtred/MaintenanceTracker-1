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

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true
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
