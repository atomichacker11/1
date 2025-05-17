import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Authentication middleware - checks if user is logged in
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Admin middleware - checks if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin privileges required" });
    }
    
    // Add user to request for logging purposes
    (req as any).user = user;
    
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Audit log middleware for admin actions
export const auditLog = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(body) {
      // Only log successful actions
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        
        console.log(`[ADMIN AUDIT] ${new Date().toISOString()} | User: ${user?.username} (ID: ${user?.id}) | Action: ${action} | IP: ${req.ip}`);
        
        // Additional data can be added to the log depending on the action
        if (req.params && Object.keys(req.params).length > 0) {
          console.log(`[ADMIN AUDIT] Params:`, req.params);
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};