import { users, type User, type InsertUser, wallets, type Wallet, type InsertWallet, visualizations, 
  type Visualization, type InsertVisualization, transactions, type Transaction, type InsertTransaction, 
  transactionTracking, type TransactionTracking, type InsertTransactionTracking, 
  entities, type Entity, type InsertEntity, walletEntityRelations, type WalletEntityRelation, 
  type InsertWalletEntityRelation, fundingSources, type FundingSource, type InsertFundingSource,
  activityPatterns, type ActivityPattern, type InsertActivityPattern } from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, and, desc, sql, or, count, max, min, avg } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wallet operations
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletLastFetched(id: number): Promise<Wallet | undefined>;
  getUserWallets(userId: number): Promise<Wallet[]>;
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionBySignature(signature: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getWalletTransactions(address: string, limit?: number): Promise<Transaction[]>;
  
  // Transaction tracking operations
  trackTransaction(tracking: InsertTransactionTracking): Promise<TransactionTracking>;
  getTrackedTransactions(userId: number, visualizationId?: number): Promise<TransactionTracking[]>;
  
  // Funding source tracking operations
  getFundingSources(walletId: number): Promise<FundingSource[]>;
  addFundingSource(source: InsertFundingSource): Promise<FundingSource>;
  updateFundingSource(id: number, source: Partial<InsertFundingSource>): Promise<FundingSource | undefined>;
  
  // Activity pattern operations
  getWalletActivityPatterns(walletId: number): Promise<ActivityPattern[]>;
  addActivityPattern(pattern: InsertActivityPattern): Promise<ActivityPattern>;
  updateActivityPattern(id: number, pattern: Partial<InsertActivityPattern>): Promise<ActivityPattern | undefined>;
  
  // Entity operations
  getEntity(id: number): Promise<Entity | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  getEntities(userId?: number): Promise<Entity[]>;
  getEntitiesByType(type: string): Promise<Entity[]>;
  getEntityByAddress(address: string): Promise<Entity | undefined>;
  
  // Wallet-Entity relationship operations
  addWalletToEntity(relation: InsertWalletEntityRelation): Promise<WalletEntityRelation>;
  getWalletEntities(walletId: number): Promise<Entity[]>;
  getEntityWallets(entityId: number): Promise<Wallet[]>;
  
  // Visualization operations
  getVisualization(id: number): Promise<Visualization | undefined>;
  getVisualizationByShareToken(token: string): Promise<Visualization | undefined>;
  createVisualization(visualization: InsertVisualization): Promise<Visualization>;
  updateVisualization(id: number, visualization: Partial<InsertVisualization>): Promise<Visualization | undefined>;
  getUserVisualizations(userId: number): Promise<Visualization[]>;
  deleteVisualization(id: number): Promise<boolean>;
  shareVisualization(id: number, shared: boolean): Promise<Visualization | undefined>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  getUserTeams(userId: number): Promise<Team[]>;
  
  // Team member operations
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getTeamMemberById(id: number): Promise<TeamMember | undefined>;
  updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  removeTeamMember(id: number): Promise<boolean>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  isTeamMember(teamId: number, userId: number): Promise<boolean>;
  
  // Team visualization operations
  addTeamVisualization(teamVisualization: InsertTeamVisualization): Promise<TeamVisualization>;
  getTeamVisualization(teamId: number, visualizationId: number): Promise<TeamVisualization | undefined>;
  removeTeamVisualization(teamId: number, visualizationId: number): Promise<boolean>;
  getTeamVisualizations(teamId: number): Promise<Visualization[]>;
  userHasTeamAccessToVisualization(userId: number, visualizationId: number): Promise<boolean>;
  userIsTeamAdminForVisualization(userId: number, visualizationId: number): Promise<boolean>;
  
  // Annotation operations
  createAnnotation(annotation: InsertComment): Promise<Comment>;
  getAnnotation(id: number): Promise<Comment | undefined>;
  updateAnnotation(id: number, annotation: Partial<InsertComment>): Promise<Comment | undefined>;
  deleteAnnotation(id: number): Promise<boolean>;
  getVisualizationAnnotations(visualizationId: number): Promise<Comment[]>;
  getAnnotationReplies(annotationId: number): Promise<Comment[]>;
}

// In-memory storage implementation (kept for reference)
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
  
  // Transaction operations - not implemented in MemStorage
  async getTransaction(id: number): Promise<Transaction | undefined> {
    throw new Error("Transaction operations not implemented in MemStorage");
  }
  
  async getTransactionBySignature(signature: string): Promise<Transaction | undefined> {
    throw new Error("Transaction operations not implemented in MemStorage");
  }
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    throw new Error("Transaction operations not implemented in MemStorage");
  }
  
  async getWalletTransactions(address: string, limit?: number): Promise<Transaction[]> {
    throw new Error("Transaction operations not implemented in MemStorage");
  }
  
  // Transaction tracking operations - not implemented in MemStorage
  async trackTransaction(tracking: InsertTransactionTracking): Promise<TransactionTracking> {
    throw new Error("Transaction tracking operations not implemented in MemStorage");
  }
  
  async getTrackedTransactions(userId: number, visualizationId?: number): Promise<TransactionTracking[]> {
    throw new Error("Transaction tracking operations not implemented in MemStorage");
  }
  
  // Funding source tracking operations - not implemented in MemStorage
  async getFundingSources(walletId: number): Promise<FundingSource[]> {
    throw new Error("Funding source operations not implemented in MemStorage");
  }
  
  async addFundingSource(source: InsertFundingSource): Promise<FundingSource> {
    throw new Error("Funding source operations not implemented in MemStorage");
  }
  
  async updateFundingSource(id: number, source: Partial<InsertFundingSource>): Promise<FundingSource | undefined> {
    throw new Error("Funding source operations not implemented in MemStorage");
  }
  
  // Activity pattern operations - not implemented in MemStorage
  async getWalletActivityPatterns(walletId: number): Promise<ActivityPattern[]> {
    throw new Error("Activity pattern operations not implemented in MemStorage");
  }
  
  async addActivityPattern(pattern: InsertActivityPattern): Promise<ActivityPattern> {
    throw new Error("Activity pattern operations not implemented in MemStorage");
  }
  
  async updateActivityPattern(id: number, pattern: Partial<InsertActivityPattern>): Promise<ActivityPattern | undefined> {
    throw new Error("Activity pattern operations not implemented in MemStorage");
  }
  
  // Entity operations - not implemented in MemStorage
  async getEntity(id: number): Promise<Entity | undefined> {
    throw new Error("Entity operations not implemented in MemStorage");
  }
  
  async createEntity(entity: InsertEntity): Promise<Entity> {
    throw new Error("Entity operations not implemented in MemStorage");
  }
  
  async getEntities(userId?: number): Promise<Entity[]> {
    throw new Error("Entity operations not implemented in MemStorage");
  }
  
  async getEntitiesByType(type: string): Promise<Entity[]> {
    throw new Error("Entity operations not implemented in MemStorage");
  }
  
  async getEntityByAddress(address: string): Promise<Entity | undefined> {
    throw new Error("Entity operations not implemented in MemStorage");
  }
  
  // Wallet-Entity relationship operations - not implemented in MemStorage
  async addWalletToEntity(relation: InsertWalletEntityRelation): Promise<WalletEntityRelation> {
    throw new Error("Wallet-Entity operations not implemented in MemStorage");
  }
  
  async getWalletEntities(walletId: number): Promise<Entity[]> {
    throw new Error("Wallet-Entity operations not implemented in MemStorage");
  }
  
  async getEntityWallets(entityId: number): Promise<Wallet[]> {
    throw new Error("Wallet-Entity operations not implemented in MemStorage");
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

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
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

  // Wallet methods
  async getWallet(id: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet;
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.address, address));
    return wallet;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values({
      ...insertWallet,
      lastFetched: new Date(),
      firstSeen: new Date(),
      lastActivity: new Date(),
    }).returning();
    return wallet;
  }

  async updateWalletLastFetched(id: number): Promise<Wallet | undefined> {
    const [wallet] = await db
      .update(wallets)
      .set({ lastFetched: new Date() })
      .where(eq(wallets.id, id))
      .returning();
    return wallet;
  }

  async getUserWallets(userId: number): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.userId, userId));
  }
  
  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }
  
  async getTransactionBySignature(signature: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.signature, signature));
    return transaction;
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    // Check if transaction already exists
    const existing = await this.getTransactionBySignature(insertTransaction.signature);
    if (existing) {
      return existing;
    }
    
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }
  
  async getWalletTransactions(address: string, limit: number = 50): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(sql`${transactions.sourceAddress} = ${address} OR ${transactions.destinationAddress} = ${address}`)
      .orderBy(desc(transactions.blockTime))
      .limit(limit);
  }
  
  // Transaction tracking operations
  async trackTransaction(insertTracking: InsertTransactionTracking): Promise<TransactionTracking> {
    const [tracking] = await db.insert(transactionTracking)
      .values({
        ...insertTracking,
        lastViewed: new Date()
      })
      .returning();
    return tracking;
  }
  
  async getTrackedTransactions(userId: number, visualizationId?: number): Promise<TransactionTracking[]> {
    let query = db.select().from(transactionTracking).where(eq(transactionTracking.userId, userId));
      
    if (visualizationId) {
      query = query.where(eq(transactionTracking.visualizationId, visualizationId));
    }
    
    return query;
  }
  
  // Funding source tracking operations
  async getFundingSources(walletId: number): Promise<FundingSource[]> {
    return db.select()
      .from(fundingSources)
      .where(eq(fundingSources.walletId, walletId))
      .orderBy(desc(fundingSources.totalAmount));
  }
  
  async addFundingSource(insertSource: InsertFundingSource): Promise<FundingSource> {
    // Check if the funding source already exists for this wallet-source pair
    const existingSources = await db.select()
      .from(fundingSources)
      .where(and(
        eq(fundingSources.walletId, insertSource.walletId),
        eq(fundingSources.sourceWalletId, insertSource.sourceWalletId)
      ));
    
    if (existingSources.length > 0) {
      // Update existing source
      const existingSource = existingSources[0];
      const totalAmount = (existingSource.totalAmount || 0) + (insertSource.totalAmount || 0);
      const transactionCount = (existingSource.transactionCount || 1) + 1;
      
      const [updatedSource] = await db.update(fundingSources)
        .set({
          totalAmount,
          transactionCount,
          lastTransactionSignature: insertSource.lastTransactionSignature || existingSource.lastTransactionSignature,
          lastTransactionDate: insertSource.lastTransactionDate || existingSource.lastTransactionDate,
          confidence: Math.min(existingSource.confidence + 0.05, 1.0) // Increase confidence slightly
        })
        .where(eq(fundingSources.id, existingSource.id))
        .returning();
        
      return updatedSource;
    }
    
    // Create new funding source
    const [source] = await db.insert(fundingSources)
      .values(insertSource)
      .returning();
    
    return source;
  }
  
  async updateFundingSource(id: number, partialSource: Partial<InsertFundingSource>): Promise<FundingSource | undefined> {
    const [source] = await db.update(fundingSources)
      .set(partialSource)
      .where(eq(fundingSources.id, id))
      .returning();
    
    return source;
  }
  
  // Activity pattern operations
  async getWalletActivityPatterns(walletId: number): Promise<ActivityPattern[]> {
    return db.select()
      .from(activityPatterns)
      .where(eq(activityPatterns.walletId, walletId))
      .orderBy(desc(activityPatterns.confidence));
  }
  
  async addActivityPattern(insertPattern: InsertActivityPattern): Promise<ActivityPattern> {
    // Check if a similar pattern already exists
    const existingPatterns = await db.select()
      .from(activityPatterns)
      .where(and(
        eq(activityPatterns.walletId, insertPattern.walletId),
        eq(activityPatterns.pattern, insertPattern.pattern)
      ));
    
    if (existingPatterns.length > 0) {
      // Update existing pattern
      const existingPattern = existingPatterns[0];
      const [updatedPattern] = await db.update(activityPatterns)
        .set({
          lastObserved: new Date(),
          confidence: Math.min((existingPattern.confidence || 0.5) + 0.1, 1.0) // Increase confidence
        })
        .where(eq(activityPatterns.id, existingPattern.id))
        .returning();
        
      return updatedPattern;
    }
    
    // Create new activity pattern
    const [pattern] = await db.insert(activityPatterns)
      .values({
        ...insertPattern,
        firstObserved: new Date(),
        lastObserved: new Date()
      })
      .returning();
      
    return pattern;
  }
  
  async updateActivityPattern(id: number, partialPattern: Partial<InsertActivityPattern>): Promise<ActivityPattern | undefined> {
    const [pattern] = await db.update(activityPatterns)
      .set(partialPattern)
      .where(eq(activityPatterns.id, id))
      .returning();
    
    return pattern;
  }
  
  // Entity operations
  async getEntity(id: number): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity;
  }
  
  async createEntity(insertEntity: InsertEntity): Promise<Entity> {
    const [entity] = await db.insert(entities).values(insertEntity).returning();
    return entity;
  }
  
  async getEntities(userId?: number): Promise<Entity[]> {
    if (userId) {
      return db.select()
        .from(entities)
        .where(sql`${entities.userId} = ${userId} OR ${entities.isPublic} = true`);
    }
    return db.select().from(entities).where(eq(entities.isPublic, true));
  }
  
  async getEntitiesByType(type: string): Promise<Entity[]> {
    return db.select().from(entities).where(eq(entities.type, type));
  }
  
  async getEntityByAddress(address: string): Promise<Entity | undefined> {
    // Find wallet by address
    const wallet = await this.getWalletByAddress(address);
    if (!wallet) return undefined;
    
    // Get entities associated with this wallet
    const walletEntities = await this.getWalletEntities(wallet.id);
    
    // Return the first entity if any (usually there should be only one per wallet)
    return walletEntities.length > 0 ? walletEntities[0] : undefined;
  }
  
  // Wallet-Entity relationship operations
  async addWalletToEntity(insertRelation: InsertWalletEntityRelation): Promise<WalletEntityRelation> {
    const [relation] = await db.insert(walletEntityRelations)
      .values(insertRelation)
      .returning();
    return relation;
  }
  
  async getWalletEntities(walletId: number): Promise<Entity[]> {
    return db.select({
      id: entities.id,
      name: entities.name,
      type: entities.type,
      description: entities.description,
      icon: entities.icon,
      color: entities.color,
      userId: entities.userId,
      isPublic: entities.isPublic,
      createdAt: entities.createdAt
    })
    .from(entities)
    .innerJoin(
      walletEntityRelations,
      eq(entities.id, walletEntityRelations.entityId)
    )
    .where(eq(walletEntityRelations.walletId, walletId));
  }
  
  async getEntityWallets(entityId: number): Promise<Wallet[]> {
    return db.select({
      id: wallets.id,
      address: wallets.address,
      label: wallets.label,
      balance: wallets.balance,
      executable: wallets.executable,
      owner: wallets.owner,
      type: wallets.type,
      lastFetched: wallets.lastFetched,
      userId: wallets.userId,
      firstSeen: wallets.firstSeen,
      lastActivity: wallets.lastActivity,
      tags: wallets.tags,
      notes: wallets.notes,
      bookmarked: wallets.bookmarked,
      verified: wallets.verified,
      risk: wallets.risk,
      category: wallets.category,
      metadata: wallets.metadata
    })
    .from(wallets)
    .innerJoin(
      walletEntityRelations,
      eq(wallets.id, walletEntityRelations.walletId)
    )
    .where(eq(walletEntityRelations.entityId, entityId));
  }

  // Visualization methods
  async getVisualization(id: number): Promise<Visualization | undefined> {
    const [visualization] = await db.select().from(visualizations).where(eq(visualizations.id, id));
    return visualization;
  }

  async getVisualizationByShareToken(token: string): Promise<Visualization | undefined> {
    const [visualization] = await db.select()
      .from(visualizations)
      .where(and(
        eq(visualizations.shareToken, token),
        eq(visualizations.shared, true)
      ));
    return visualization;
  }

  async createVisualization(insertVisualization: InsertVisualization): Promise<Visualization> {
    const shareToken = nanoid(10);
    const now = new Date();
    
    const [visualization] = await db.insert(visualizations)
      .values({
        ...insertVisualization,
        shareToken,
        createdAt: now,
        lastModified: now
      })
      .returning();
    
    return visualization;
  }

  async updateVisualization(id: number, partialVisualization: Partial<InsertVisualization>): Promise<Visualization | undefined> {
    const [visualization] = await db.update(visualizations)
      .set({
        ...partialVisualization,
        lastModified: new Date()
      })
      .where(eq(visualizations.id, id))
      .returning();
    
    return visualization;
  }

  async getUserVisualizations(userId: number): Promise<Visualization[]> {
    return db.select()
      .from(visualizations)
      .where(eq(visualizations.userId, userId));
  }

  async deleteVisualization(id: number): Promise<boolean> {
    const result = await db.delete(visualizations)
      .where(eq(visualizations.id, id));
    
    return result.rowCount > 0;
  }

  async shareVisualization(id: number, shared: boolean): Promise<Visualization | undefined> {
    const [visualization] = await db.update(visualizations)
      .set({ 
        shared,
        lastModified: new Date()
      })
      .where(eq(visualizations.id, id))
      .returning();
    
    return visualization;
  }
}

// Use the database storage
export const storage = new DatabaseStorage();
