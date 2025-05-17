import {
  users, User, InsertUser,
  gameRounds, GameRound, InsertGameRound,
  bets, Bet, InsertBet,
  transactions, Transaction, InsertTransaction
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Game round operations
  createGameRound(round: InsertGameRound): Promise<GameRound>;
  getGameRound(id: number): Promise<GameRound | undefined>;
  getActiveGameRound(): Promise<GameRound | undefined>;
  getRecentGameRounds(limit?: number): Promise<GameRound[]>;
  updateGameRound(id: number, updates: Partial<GameRound>): Promise<GameRound | undefined>;
  getTotalRoundsPlayed(): Promise<number>;
  
  // Bet operations
  createBet(bet: InsertBet): Promise<Bet>;
  getBet(id: number): Promise<Bet | undefined>;
  getBetsByUser(userId: number, limit?: number): Promise<Bet[]>;
  getBetsByRound(roundId: number): Promise<Bet[]>;
  updateBet(id: number, updates: Partial<Bet>): Promise<Bet | undefined>;
  getTotalBets(): Promise<number>;
  getTotalUserBets(userId: number): Promise<number>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: number, limit?: number): Promise<Transaction[]>;
  getUserBalance(userId: number): Promise<number>;
  getTotalHouseProfit(): Promise<number>;
  
  // Admin operations
  createAuditLog(adminId: number, action: string, details: string): Promise<void>;
  getAuditLogs(limit?: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameRounds: Map<number, GameRound>;
  private bets: Map<number, Bet>;
  private transactions: Map<number, Transaction>;
  private auditLogs: Array<{id: number, adminId: number, action: string, details: string, timestamp: Date}>;
  
  private userId: number;
  private roundId: number;
  private betId: number;
  private transactionId: number;
  private roundNumber: number;
  private auditLogId: number;

  constructor() {
    this.users = new Map();
    this.gameRounds = new Map();
    this.bets = new Map();
    this.transactions = new Map();
    this.auditLogs = [];
    
    this.userId = 1;
    this.roundId = 1;
    this.betId = 1;
    this.transactionId = 1;
    this.roundNumber = 1;
    this.auditLogId = 1;
    
    // Create a default admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$D2Hk0/L0dJFVVTHZ.ZY1VepTgKdFp4YnTnZpPQ3.b/IX4HIhZKVwy", // "admin123"
      email: "admin@example.com",
      name: "System Admin",
      role: "admin",
    }).catch(err => console.error("Failed to create admin user:", err));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const balance = 1000; // Default starting balance
    
    const user: User = { 
      ...insertUser, 
      id, 
      balance, 
      createdAt, 
      updatedAt 
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Game round operations
  async createGameRound(insertRound: InsertGameRound): Promise<GameRound> {
    const id = this.roundId++;
    const createdAt = new Date();
    
    // If roundNumber is not provided, use the internal counter
    if (!insertRound.roundNumber) {
      insertRound.roundNumber = this.roundNumber++;
    }
    
    const round: GameRound = { 
      ...insertRound, 
      id, 
      createdAt 
    };
    
    this.gameRounds.set(id, round);
    return round;
  }

  async getGameRound(id: number): Promise<GameRound | undefined> {
    return this.gameRounds.get(id);
  }

  async getActiveGameRound(): Promise<GameRound | undefined> {
    const now = new Date();
    
    // Find a round where now is between startTime and endTime
    return Array.from(this.gameRounds.values()).find(
      (round) => round.startTime <= now && round.endTime >= now
    );
  }

  async getRecentGameRounds(limit = 10): Promise<GameRound[]> {
    return Array.from(this.gameRounds.values())
      .sort((a, b) => b.roundNumber - a.roundNumber)
      .slice(0, limit);
  }

  async updateGameRound(id: number, updates: Partial<GameRound>): Promise<GameRound | undefined> {
    const round = this.gameRounds.get(id);
    if (!round) return undefined;
    
    const updatedRound = { ...round, ...updates };
    this.gameRounds.set(id, updatedRound);
    return updatedRound;
  }

  // Bet operations
  async createBet(insertBet: InsertBet): Promise<Bet> {
    const id = this.betId++;
    const createdAt = new Date();
    
    const bet: Bet = { 
      ...insertBet, 
      id, 
      createdAt 
    };
    
    this.bets.set(id, bet);
    return bet;
  }

  async getBet(id: number): Promise<Bet | undefined> {
    return this.bets.get(id);
  }

  async getBetsByUser(userId: number, limit = 20): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .filter(bet => bet.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getBetsByRound(roundId: number): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .filter(bet => bet.roundId === roundId);
  }

  async updateBet(id: number, updates: Partial<Bet>): Promise<Bet | undefined> {
    const bet = this.bets.get(id);
    if (!bet) return undefined;
    
    const updatedBet = { ...bet, ...updates };
    this.bets.set(id, updatedBet);
    return updatedBet;
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const createdAt = new Date();
    
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt 
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransactionsByUser(userId: number, limit = 20): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUserBalance(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    return user ? user.balance : 0;
  }
  
  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getTotalRoundsPlayed(): Promise<number> {
    return this.gameRounds.size;
  }
  
  async getTotalBets(): Promise<number> {
    return this.bets.size;
  }
  
  async getTotalUserBets(userId: number): Promise<number> {
    return Array.from(this.bets.values())
      .filter(bet => bet.userId === userId)
      .length;
  }
  
  async getTotalHouseProfit(): Promise<number> {
    // Calculate house profit from winning and losing bets
    const bets = Array.from(this.bets.values());
    
    // Sum up house profit (lost bets - won bets)
    return bets.reduce((total, bet) => {
      if (bet.status === 'lost') {
        // House keeps the bet amount
        return total + bet.amount;
      } else if (bet.status === 'won' && bet.profit) {
        // House pays out the profit
        return total - bet.profit;
      }
      return total;
    }, 0);
  }
  
  async createAuditLog(adminId: number, action: string, details: string): Promise<void> {
    const id = this.auditLogId++;
    const timestamp = new Date();
    
    this.auditLogs.push({
      id,
      adminId,
      action,
      details,
      timestamp
    });
  }
  
  async getAuditLogs(limit = 50): Promise<any[]> {
    return this.auditLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
