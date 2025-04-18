import { users, type User, type InsertUser, wallets, type Wallet, type InsertWallet, visualizations, type Visualization, type InsertVisualization } from "@shared/schema";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wallet operations
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletLastFetched(id: number): Promise<Wallet | undefined>;
  getUserWallets(userId: number): Promise<Wallet[]>;
  
  // Visualization operations
  getVisualization(id: number): Promise<Visualization | undefined>;
  getVisualizationByShareToken(token: string): Promise<Visualization | undefined>;
  createVisualization(visualization: InsertVisualization): Promise<Visualization>;
  updateVisualization(id: number, visualization: Partial<InsertVisualization>): Promise<Visualization | undefined>;
  getUserVisualizations(userId: number): Promise<Visualization[]>;
  deleteVisualization(id: number): Promise<boolean>;
  shareVisualization(id: number, shared: boolean): Promise<Visualization | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wallets: Map<number, Wallet>;
  private visualizations: Map<number, Visualization>;
  private currentUserId: number;
  private currentWalletId: number;
  private currentVisualizationId: number;

  constructor() {
    this.users = new Map();
    this.wallets = new Map();
    this.visualizations = new Map();
    this.currentUserId = 1;
    this.currentWalletId = 1;
    this.currentVisualizationId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wallet methods
  async getWallet(id: number): Promise<Wallet | undefined> {
    return this.wallets.get(id);
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(
      (wallet) => wallet.address === address,
    );
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const id = this.currentWalletId++;
    const wallet: Wallet = { 
      ...insertWallet, 
      id, 
      lastFetched: new Date()
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  async updateWalletLastFetched(id: number): Promise<Wallet | undefined> {
    const wallet = await this.getWallet(id);
    if (!wallet) return undefined;
    
    const updatedWallet = { ...wallet, lastFetched: new Date() };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  async getUserWallets(userId: number): Promise<Wallet[]> {
    return Array.from(this.wallets.values()).filter(
      (wallet) => wallet.userId === userId,
    );
  }

  // Visualization methods
  async getVisualization(id: number): Promise<Visualization | undefined> {
    return this.visualizations.get(id);
  }

  async getVisualizationByShareToken(token: string): Promise<Visualization | undefined> {
    return Array.from(this.visualizations.values()).find(
      (vis) => vis.shareToken === token && vis.shared,
    );
  }

  async createVisualization(insertVisualization: InsertVisualization): Promise<Visualization> {
    const id = this.currentVisualizationId++;
    const shareToken = nanoid(10);
    const visualization: Visualization = { 
      ...insertVisualization, 
      id, 
      createdAt: new Date(),
      shareToken,
    };
    this.visualizations.set(id, visualization);
    return visualization;
  }

  async updateVisualization(id: number, partialVisualization: Partial<InsertVisualization>): Promise<Visualization | undefined> {
    const visualization = await this.getVisualization(id);
    if (!visualization) return undefined;
    
    const updatedVisualization = { ...visualization, ...partialVisualization };
    this.visualizations.set(id, updatedVisualization);
    return updatedVisualization;
  }

  async getUserVisualizations(userId: number): Promise<Visualization[]> {
    return Array.from(this.visualizations.values()).filter(
      (vis) => vis.userId === userId,
    );
  }

  async deleteVisualization(id: number): Promise<boolean> {
    return this.visualizations.delete(id);
  }

  async shareVisualization(id: number, shared: boolean): Promise<Visualization | undefined> {
    const visualization = await this.getVisualization(id);
    if (!visualization) return undefined;
    
    const updatedVisualization = { ...visualization, shared };
    this.visualizations.set(id, updatedVisualization);
    return updatedVisualization;
  }
}

export const storage = new MemStorage();
