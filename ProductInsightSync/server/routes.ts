import { createServer, type Server } from "http";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { isAdmin, auditLog } from "./middleware/authMiddleware";
import { z } from "zod";
import {
  insertUserSchema, loginSchema, registerSchema, betSchema,
  insertGameRoundSchema, insertBetSchema, insertTransactionSchema
} from "@shared/schema";
import { Server as SocketServer } from "socket.io";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        createTableIfMissing: true,
        tableName: 'sessions'
      }),
      secret: process.env.SESSION_SECRET || "your-betting-platform-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === "production",
      },
    })
  );
  
  // Create demo accounts (this runs once when server starts)
  try {
    // Create demo account with high balance
    const demoExists = await storage.getUserByUsername("demo");
    if (!demoExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        username: "demo",
        password: hashedPassword,
        email: "demo@example.com",
        name: "Demo User",
        role: "user",
        balance: 50000
      });
      console.log("Demo account created successfully!");
    }
    
    // Create admin account
    const adminExists = await storage.getUserByUsername("admin");
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        name: "System Admin",
        role: "admin",
        balance: 10000
      });
      console.log("Admin account created successfully!");
    }
  } catch (error) {
    console.error("Error creating demo accounts:", error);
  }

  // Authentication middleware
  const authenticateUser = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // User routes
  app.post("/api/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);

      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const passwordMatch = await bcrypt.compare(data.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = user.id;
      
      // Don't send the password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Set session
      req.session.userId = user.id;
      
      // Don't send the password back
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.get("/api/user", authenticateUser, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("User fetch error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game Round Routes
  app.get("/api/game/active", async (req, res) => {
    try {
      const activeRound = await storage.getActiveGameRound();
      
      if (!activeRound) {
        return res.status(404).json({ message: "No active game round" });
      }
      
      res.json(activeRound);
    } catch (error) {
      console.error("Active round fetch error:", error);
      res.status(500).json({ message: "Failed to fetch active round" });
    }
  });

  app.get("/api/game/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const rounds = await storage.getRecentGameRounds(limit);
      res.json(rounds);
    } catch (error) {
      console.error("Game history fetch error:", error);
      res.status(500).json({ message: "Failed to fetch game history" });
    }
  });

  // Betting Routes
  app.post("/api/bets", authenticateUser, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const betData = betSchema.parse(req.body);
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has enough balance
      if (user.balance < betData.amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Get the round
      const round = await storage.getGameRound(betData.roundId);
      if (!round) {
        return res.status(404).json({ message: "Game round not found" });
      }
      
      // Check if round is still active
      const now = new Date();
      if (now >= round.endTime) {
        return res.status(400).json({ message: "Betting for this round has ended" });
      }
      
      // Calculate potential win amount based on color
      let multiplier = 1.0;
      if (betData.color === "red" || betData.color === "green") {
        multiplier = 2.0; // 1:1 payout
      } else if (betData.color === "violet") {
        multiplier = 4.0; // 3:1 payout
      }
      
      const potential = betData.amount * multiplier;
      
      // Create the bet
      const bet = await storage.createBet({
        userId,
        roundId: betData.roundId,
        color: betData.color,
        amount: betData.amount,
        potential,
        status: "pending"
      });
      
      // Update user's balance
      const balanceBefore = user.balance;
      const balanceAfter = balanceBefore - betData.amount;
      
      await storage.updateUser(userId, {
        balance: balanceAfter
      });
      
      // Record transaction
      await storage.createTransaction({
        userId,
        amount: -betData.amount,
        type: "bet",
        reference: `Bet #${bet.id}`,
        balanceBefore,
        balanceAfter
      });
      
      res.status(201).json(bet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      console.error("Bet creation error:", error);
      res.status(500).json({ message: "Failed to place bet" });
    }
  });

  app.get("/api/bets/user", authenticateUser, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const bets = await storage.getBetsByUser(userId, limit);
      res.json(bets);
    } catch (error) {
      console.error("User bets fetch error:", error);
      res.status(500).json({ message: "Failed to fetch user bets" });
    }
  });

  // Wallet routes
  app.get("/api/wallet/balance", authenticateUser, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const balance = await storage.getUserBalance(userId);
      res.json({ balance });
    } catch (error) {
      console.error("Balance fetch error:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get("/api/wallet/transactions", authenticateUser, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const transactions = await storage.getTransactionsByUser(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Transactions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Admin Routes

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive information
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Admin users fetch error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const totalUsers = (await storage.getAllUsers()).length;
      const totalRounds = await storage.getTotalRoundsPlayed();
      const totalBets = await storage.getTotalBets();
      const houseProfit = await storage.getTotalHouseProfit();
      
      res.json({
        totalUsers,
        totalRounds,
        totalBets,
        houseProfit
      });
    } catch (error) {
      console.error("Admin stats fetch error:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Audit logs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:userId", isAdmin, auditLog("update_user"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      
      // Prevent updating sensitive fields directly
      delete updates.password;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      // Record audit log
      const adminId = (req as any).user.id;
      await storage.createAuditLog(
        adminId,
        "update_user",
        `Admin ${adminId} updated user ${userId}: ${JSON.stringify(updates)}`
      );
      
      // Return updated user without password
      const { password, ...userWithoutPassword } = updatedUser!;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Admin user update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Force a game round result (admin only)
  app.post("/api/admin/force-round", isAdmin, auditLog("force_round"), async (req, res) => {
    try {
      const { roundId, result, multiplier } = req.body;
      
      if (!roundId || !result || !multiplier) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const round = await storage.getGameRound(roundId);
      if (!round) {
        return res.status(404).json({ message: "Round not found" });
      }
      
      // Update the round result
      const updatedRound = await storage.updateGameRound(roundId, {
        result,
        multiplier: parseFloat(multiplier)
      });
      
      // Record audit log
      const adminId = (req as any).user.id;
      await storage.createAuditLog(
        adminId,
        "force_round_result",
        `Admin ${adminId} forced round ${roundId} result to ${result} with multiplier ${multiplier}`
      );
      
      res.json(updatedRound);
    } catch (error) {
      console.error("Admin force round error:", error);
      res.status(500).json({ message: "Failed to force round result" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up Socket.io for real-time updates
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Setup game rounds
  setupGameEngine(io);
  
  // Handle Socket.io connections
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Join room for real-time game updates
    socket.on("join-game", () => {
      socket.join("game-room");
    });
    
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
  
  // Store io instance on app for use in other parts
  (app as any).io = io;
  
  return httpServer;
}

// Game engine to manage rounds
async function setupGameEngine(io: SocketServer) {
  let gameInterval: NodeJS.Timeout;
  const ROUND_DURATION_MS = 60000; // 60 seconds
  
  // Initialize with a new round
  await createNewRound();
  
  // Setup interval to create new rounds
  gameInterval = setInterval(async () => {
    await createNewRound();
  }, ROUND_DURATION_MS);
  
  async function createNewRound() {
    try {
      // Get active round and complete it if exists
      const activeRound = await storage.getActiveGameRound();
      if (activeRound) {
        await completeRound(activeRound);
      }
      
      // Create new round
      const now = new Date();
      const endTime = new Date(now.getTime() + ROUND_DURATION_MS);
      
      const newRound = await storage.createGameRound({
        roundNumber: 0, // The storage will auto-increment this
        startTime: now,
        endTime: endTime,
        result: "", // Will be set when round completes
        multiplier: 0, // Will be set when round completes
      });
      
      // Emit new round to connected clients
      io.to("game-room").emit("round-start", newRound);
      
      // Schedule round completion
      setTimeout(async () => {
        await completeRound(newRound);
      }, ROUND_DURATION_MS);
      
      return newRound;
    } catch (error) {
      console.error("Error creating new round:", error);
    }
  }
  
  async function completeRound(round: any) {
    try {
      // Determine result
      const colors = ["red", "green", "violet"];
      const randomIndex = Math.floor(Math.random() * colors.length);
      const result = colors[randomIndex];
      
      // Set multipliers based on color
      let multiplier = 1.0;
      if (result === "red" || result === "green") {
        multiplier = 2.0; // 1:1 payout
      } else if (result === "violet") {
        multiplier = 4.0; // 3:1 payout
      }
      
      // Update round with result
      const updatedRound = await storage.updateGameRound(round.id, {
        result,
        multiplier
      });
      
      // Process all bets for this round
      const bets = await storage.getBetsByRound(round.id);
      
      for (const bet of bets) {
        // Skip already processed bets
        if (bet.status !== "pending") continue;
        
        const user = await storage.getUser(bet.userId);
        if (!user) continue;
        
        const won = bet.color === result;
        const status = won ? "won" : "lost";
        let profit = 0;
        
        // If won, calculate profit
        if (won) {
          profit = bet.potential - bet.amount;
          
          // Update user balance
          const newBalance = user.balance + bet.potential;
          await storage.updateUser(user.id, { balance: newBalance });
          
          // Create transaction record
          await storage.createTransaction({
            userId: user.id,
            amount: bet.potential,
            type: "win",
            reference: `Round #${round.roundNumber}`,
            balanceBefore: user.balance,
            balanceAfter: newBalance
          });
        }
        
        // Update bet status
        await storage.updateBet(bet.id, {
          status,
          profit: won ? profit : 0
        });
      }
      
      // Emit round completion to connected clients
      io.to("game-room").emit("round-end", updatedRound);
      
      return updatedRound;
    } catch (error) {
      console.error("Error completing round:", error);
    }
  }
}