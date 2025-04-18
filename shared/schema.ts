import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User account model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Wallet model to store searched wallets
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  label: text("label"),
  lastFetched: timestamp("last_fetched"),
  userId: integer("user_id").references(() => users.id),
});

export const insertWalletSchema = createInsertSchema(wallets).pick({
  address: true,
  label: true,
  userId: true,
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
  shared: boolean("shared").default(false),
  shareToken: text("share_token"),
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
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type InsertVisualization = z.infer<typeof insertVisualizationSchema>;
export type Visualization = typeof visualizations.$inferSelect;
