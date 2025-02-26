import { User, WorkOrder, Asset, InsertUser, InsertWorkOrder, InsertAsset } from "@shared/schema";
import { users, workOrders, assets } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session
  sessionStore: session.Store;

  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Work Orders
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  updateWorkOrder(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder>;

  // Assets
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset>;
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

  // Work Order Methods
  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values(workOrder).returning();
    return newWorkOrder;
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders);
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder;
  }

  async updateWorkOrder(id: number, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    const [workOrder] = await db
      .update(workOrders)
      .set(updates)
      .where(eq(workOrders.id, id))
      .returning();
    if (!workOrder) throw new Error("Work order not found");
    return workOrder;
  }

  // Asset Methods
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
    const [asset] = await db
      .update(assets)
      .set(updates)
      .where(eq(assets.id, id))
      .returning();
    if (!asset) throw new Error("Asset not found");
    return asset;
  }
}

export const storage = new DatabaseStorage();