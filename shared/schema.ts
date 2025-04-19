import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, unique, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User account model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Teams for collaborative analysis
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  ownerId: true,
  avatarUrl: true,
});

// Team membership and roles
export const teamMemberRoles = pgEnum("team_member_role", [
  "owner",
  "admin",
  "editor",
  "viewer"
]);

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: teamMemberRoles("role").default("viewer"),
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: integer("invited_by").references(() => users.id),
  status: text("status").default("active"), // active, invited, inactive
}, (table) => {
  return {
    uniqUserTeam: unique().on(table.userId, table.teamId),
  };
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
  invitedBy: true,
  status: true,
});

// Wallet model to store wallet data
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  label: text("label"),
  balance: real("balance"),
  executable: boolean("executable").default(false),
  owner: text("owner"),
  type: text("type").default("wallet"), // wallet, program, contract
  lastFetched: timestamp("last_fetched"),
  userId: integer("user_id").references(() => users.id),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastActivity: timestamp("last_activity"),
  bookmarked: boolean("bookmarked").default(false),
  tags: jsonb("tags").$type<string[]>(),
  notes: text("notes"),
  riskScore: integer("risk_score"),
  verified: boolean("verified").default(false),
  activityLevel: text("activity_level"), // 'high', 'medium', 'low'
  classification: text("classification"), // 'personal', 'exchange', 'contract', 'project', etc.
  category: text("category"),
  metadata: jsonb("metadata"),
});

export const insertWalletSchema = createInsertSchema(wallets).pick({
  address: true,
  label: true,
  userId: true,
  balance: true,
  executable: true,
  owner: true,
  type: true,
  bookmarked: true,
});

// Transaction type enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "transfer",
  "swap",
  "nft",
  "defi",
  "other",
]);

// Transactions 
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  signature: text("signature").notNull().unique(),
  sourceAddress: text("source_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  amount: real("amount"),
  blockTime: timestamp("block_time"),
  slot: integer("slot"),
  status: text("status").default("success"),
  type: transactionTypeEnum("type").default("transfer"),
  programId: text("program_id"),
  instruction: jsonb("instruction"),
  fee: real("fee"),
  memo: text("memo"),
  isCritical: boolean("is_critical").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  signature: true,
  sourceAddress: true,
  destinationAddress: true,
  amount: true,
  blockTime: true,
  slot: true,
  status: true,
  type: true,
  programId: true,
  instruction: true,
  fee: true,
  memo: true,
  isCritical: true,
  metadata: true,
});

// Transaction flow visualization saved configurations
export const visualizations = pgTable("visualizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  walletAddress: text("wallet_address").notNull(),
  config: jsonb("config").notNull(),
  dateRange: jsonb("date_range"),
  amountRange: jsonb("amount_range"),
  transactionTypes: jsonb("transaction_types"),
  programs: jsonb("programs"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastModified: timestamp("last_modified"),
  shared: boolean("shared").default(false),
  shareToken: text("share_token"),
  screenshot: text("screenshot"),
  description: text("description"),
  tags: jsonb("tags").$type<string[]>(),
  isPublic: boolean("is_public").default(false),
  isTemplate: boolean("is_template").default(false),
  viewCount: integer("view_count").default(0),
  lastViewed: timestamp("last_viewed"),
});

export const insertVisualizationSchema = createInsertSchema(visualizations).pick({
  name: true,
  walletAddress: true,
  config: true,
  dateRange: true,
  amountRange: true,
  transactionTypes: true,
  programs: true,
  userId: true,
  shared: true,
  description: true,
  tags: true,
  isPublic: true,
  isTemplate: true,
});

// Transaction tracking (which transactions are included in which visualizations)
export const transactionTracking = pgTable("transaction_tracking", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  visualizationId: integer("visualization_id").references(() => visualizations.id),
  includeInVisualization: boolean("include_in_visualization").default(true),
  highlightAsImportant: boolean("highlight_as_important").default(false),
  customNotes: text("custom_notes"),
  lastViewed: timestamp("last_viewed"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    uniqTransaction: unique().on(table.transactionId, table.userId),
  };
});

export const insertTransactionTrackingSchema = createInsertSchema(transactionTracking).pick({
  transactionId: true,
  userId: true,
  visualizationId: true,
  includeInVisualization: true,
  highlightAsImportant: true,
  customNotes: true,
});

// Comments for collaborative analysis
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  visualizationId: integer("visualization_id").references(() => visualizations.id).notNull(),
  parentId: integer("parent_id").references(() => comments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  attachmentUrl: text("attachment_url"),
  position: jsonb("position"),  // Position on the visualization where the comment is anchored (x, y coordinates)
  resolved: boolean("resolved").default(false),
  referencedNodeAddress: text("referenced_node_address"), // Which wallet address this comment references
  referencedTransactionSignature: text("referenced_transaction_signature"), // Which transaction this comment references
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  userId: true,
  visualizationId: true,
  parentId: true,
  attachmentUrl: true,
  position: true,
  referencedNodeAddress: true,
  referencedTransactionSignature: true,
});

// Team Visualizations - associates visualizations with teams for collaboration
export const teamVisualizations = pgTable("team_visualizations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  visualizationId: integer("visualization_id").references(() => visualizations.id).notNull(),
  addedById: integer("added_by_id").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  pinned: boolean("pinned").default(false),
}, (table) => {
  return {
    uniqTeamVisualization: unique().on(table.teamId, table.visualizationId),
  };
});

export const insertTeamVisualizationSchema = createInsertSchema(teamVisualizations).pick({
  teamId: true,
  visualizationId: true,
  addedById: true,
  pinned: true,
});

// Funding sources for tracking the origin of funds
export const fundingSources = pgTable("funding_sources", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  sourceWalletId: integer("source_wallet_id").references(() => wallets.id).notNull(),
  firstTransactionSignature: text("first_transaction_signature").notNull(),
  firstTransactionDate: timestamp("first_transaction_date"),
  totalAmount: real("total_amount").default(0),
  transactionCount: integer("transaction_count").default(1),
  lastTransactionSignature: text("last_transaction_signature"),
  lastTransactionDate: timestamp("last_transaction_date"),
  isDirectSource: boolean("is_direct_source").default(true),
  confidence: real("confidence").default(1), // 0-1 confidence score
  path: jsonb("path").$type<string[]>(), // Path of wallet addresses from source to destination
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFundingSourceSchema = createInsertSchema(fundingSources).pick({
  walletId: true,
  sourceWalletId: true,
  firstTransactionSignature: true,
  firstTransactionDate: true,
  totalAmount: true,
  transactionCount: true,
  lastTransactionSignature: true,
  lastTransactionDate: true,
  isDirectSource: true,
  confidence: true,
  path: true,
  userId: true,
});

// Activity patterns for wallets
export const activityPatterns = pgTable("activity_patterns", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  pattern: text("pattern").notNull(), // e.g. 'daily-transfers', 'weekly-swaps', 'exchange-withdrawals'
  firstObserved: timestamp("first_observed"),
  lastObserved: timestamp("last_observed"),
  frequency: text("frequency"), // 'daily', 'weekly', 'monthly', 'irregular'
  confidence: real("confidence").default(0.5), // 0-1 confidence score
  description: text("description"),
  metadata: jsonb("metadata"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityPatternSchema = createInsertSchema(activityPatterns).pick({
  walletId: true,
  pattern: true,
  firstObserved: true,
  lastObserved: true,
  frequency: true,
  confidence: true,
  description: true,
  metadata: true,
  userId: true,
});

// Entity clusters (like exchanges, related wallets, etc.)
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'exchange', 'defi', 'nft', 'related', 'other'
  description: text("description"),
  icon: text("icon"),
  color: varchar("color", { length: 7 }),
  userId: integer("user_id").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  website: text("website"),
  riskLevel: text("risk_level"), // 'low', 'medium', 'high'
  verificationStatus: text("verification_status").default("unverified"), // 'verified', 'unverified', 'flagged'
  metadata: jsonb("metadata"),
});

export const insertEntitySchema = createInsertSchema(entities).pick({
  name: true,
  type: true,
  description: true,
  icon: true,
  color: true,
  userId: true,
  isPublic: true,
});

// Wallet-entity relationships
export const walletEntityRelations = pgTable("wallet_entity_relations", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  confirmedBy: integer("confirmed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    uniqWalletEntity: unique().on(table.walletId, table.entityId),
  };
});

export const insertWalletEntityRelationSchema = createInsertSchema(walletEntityRelations).pick({
  walletId: true,
  entityId: true,
  confirmedBy: true,
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  visualizations: many(visualizations),
  trackedTransactions: many(transactionTracking),
  memberOfTeams: many(teamMembers),
  comments: many(comments),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  members: many(teamMembers),
  visualizations: many(teamVisualizations),
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  sourceTransactions: many(transactions, { relationName: "source" }),
  destinationTransactions: many(transactions, { relationName: "destination" }),
  entities: many(walletEntityRelations),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  source: one(wallets, {
    fields: [transactions.sourceAddress],
    references: [wallets.address],
    relationName: "source",
  }),
  destination: one(wallets, {
    fields: [transactions.destinationAddress],
    references: [wallets.address],
    relationName: "destination",
  }),
  trackings: many(transactionTracking),
}));

export const transactionTrackingRelations = relations(transactionTracking, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTracking.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [transactionTracking.userId],
    references: [users.id],
  }),
  visualization: one(visualizations, {
    fields: [transactionTracking.visualizationId],
    references: [visualizations.id],
  }),
}));

export const visualizationsRelations = relations(visualizations, ({ one, many }) => ({
  user: one(users, {
    fields: [visualizations.userId],
    references: [users.id],
  }),
  trackedTransactions: many(transactionTracking),
  comments: many(comments),
  teamVisualizations: many(teamVisualizations),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  visualization: one(visualizations, {
    fields: [comments.visualizationId],
    references: [visualizations.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const teamVisualizationsRelations = relations(teamVisualizations, ({ one }) => ({
  team: one(teams, {
    fields: [teamVisualizations.teamId],
    references: [teams.id],
  }),
  visualization: one(visualizations, {
    fields: [teamVisualizations.visualizationId],
    references: [visualizations.id],
  }),
  addedBy: one(users, {
    fields: [teamVisualizations.addedById],
    references: [users.id],
  }),
}));

export const fundingSourcesRelations = relations(fundingSources, ({ one }) => ({
  wallet: one(wallets, {
    fields: [fundingSources.walletId],
    references: [wallets.id],
  }),
  sourceWallet: one(wallets, {
    fields: [fundingSources.sourceWalletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [fundingSources.userId],
    references: [users.id],
  })
}));

export const activityPatternsRelations = relations(activityPatterns, ({ one }) => ({
  wallet: one(wallets, {
    fields: [activityPatterns.walletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [activityPatterns.userId],
    references: [users.id],
  })
}));

export const entitiesRelations = relations(entities, ({ many }) => ({
  wallets: many(walletEntityRelations),
}));

export const walletEntityRelationsRelations = relations(walletEntityRelations, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletEntityRelations.walletId],
    references: [wallets.id],
  }),
  entity: one(entities, {
    fields: [walletEntityRelations.entityId],
    references: [entities.id],
  }),
}));

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertTransactionTracking = z.infer<typeof insertTransactionTrackingSchema>;
export type TransactionTracking = typeof transactionTracking.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertTeamVisualization = z.infer<typeof insertTeamVisualizationSchema>;
export type TeamVisualization = typeof teamVisualizations.$inferSelect;

export type InsertFundingSource = z.infer<typeof insertFundingSourceSchema>;
export type FundingSource = typeof fundingSources.$inferSelect;

export type InsertActivityPattern = z.infer<typeof insertActivityPatternSchema>;
export type ActivityPattern = typeof activityPatterns.$inferSelect;

export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entities.$inferSelect;

export type InsertWalletEntityRelation = z.infer<typeof insertWalletEntityRelationSchema>;
export type WalletEntityRelation = typeof walletEntityRelations.$inferSelect;

export type InsertVisualization = z.infer<typeof insertVisualizationSchema>;
export type Visualization = typeof visualizations.$inferSelect;