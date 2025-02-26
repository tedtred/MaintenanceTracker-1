import { User, WorkOrder, Asset, InsertUser, InsertWorkOrder, InsertAsset } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workOrders: Map<number, WorkOrder>;
  private assets: Map<number, Asset>;
  private currentId: { users: number; workOrders: number; assets: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.workOrders = new Map();
    this.assets = new Map();
    this.currentId = { users: 1, workOrders: 1, assets: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Work Order Methods
  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const id = this.currentId.workOrders++;
    const newWorkOrder = { ...workOrder, id };
    this.workOrders.set(id, newWorkOrder);
    return newWorkOrder;
  }

  async getWorkOrders(): Promise<WorkOrder[]> {
    return Array.from(this.workOrders.values());
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    return this.workOrders.get(id);
  }

  async updateWorkOrder(
    id: number,
    updates: Partial<WorkOrder>,
  ): Promise<WorkOrder> {
    const workOrder = this.workOrders.get(id);
    if (!workOrder) throw new Error("Work order not found");
    const updatedWorkOrder = { ...workOrder, ...updates };
    this.workOrders.set(id, updatedWorkOrder);
    return updatedWorkOrder;
  }

  // Asset Methods
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const id = this.currentId.assets++;
    const newAsset = { ...asset, id };
    this.assets.set(id, newAsset);
    return newAsset;
  }

  async getAssets(): Promise<Asset[]> {
    return Array.from(this.assets.values());
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    const asset = this.assets.get(id);
    if (!asset) throw new Error("Asset not found");
    const updatedAsset = { ...asset, ...updates };
    this.assets.set(id, updatedAsset);
    return updatedAsset;
  }
}

export const storage = new MemStorage();
