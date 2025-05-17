import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, primaryKey, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  name: text("name"),
  balance: doublePrecision("balance").notNull().default(1000), // Starting balance of 1000
  role: text("role").notNull().default("user"), // 'user' or 'admin'
  isActive: boolean("is_active").notNull().default(true), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
});

// Game rounds table
export const gameRounds = pgTable("game_rounds", {
  id: serial("id").primaryKey(),
  roundNumber: integer("round_number").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  result: text("result").notNull(), // 'red', 'green', or 'violet'
  multiplier: doublePrecision("multiplier").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameRoundSchema = createInsertSchema(gameRounds).pick({
  roundNumber: true,
  startTime: true,
  endTime: true,
  result: true,
  multiplier: true,
});

// Bets table
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  roundId: integer("round_id").notNull(),
  color: text("color").notNull(), // 'red', 'green', or 'violet'
  amount: doublePrecision("amount").notNull(),
  potential: doublePrecision("potential").notNull(), // Potential win amount
  status: text("status").notNull().default("pending"), // 'pending', 'won', 'lost'
  profit: doublePrecision("profit"), // Will be set after round completion
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBetSchema = createInsertSchema(bets).pick({
  userId: true,
  roundId: true,
  color: true,
  amount: true,
  potential: true,
  status: true,
});

// Transactions table for wallet operations
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'win', 'bet'
  reference: text("reference"), // Reference to bet or round if applicable
  balanceBefore: doublePrecision("balance_before").notNull(),
  balanceAfter: doublePrecision("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  type: true,
  reference: true,
  balanceBefore: true,
  balanceAfter: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema> & { 
  role?: string;
  balance?: number;
};

export type GameRound = typeof gameRounds.$inferSelect;
export type InsertGameRound = z.infer<typeof insertGameRoundSchema>;

export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Extended schemas for validation
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const betSchema = z.object({
  roundId: z.number(),
  color: z.enum(["red", "green", "violet"]),
  amount: z.number().positive("Bet amount must be positive"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BetInput = z.infer<typeof betSchema>;
