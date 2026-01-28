import type { Response, NextFunction } from "express";

// 1. General Admin Check (Allows both Admin and Superadmin)
export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  console.log("--- ADMIN CHECK ---");
  
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    console.log("Result: Access Granted (Admin/Superadmin)");
    next();
  } else {
    console.log("DEBUG: Access Denied. Role found:", req.user?.role);
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// 2. Strict Superadmin Check (Only Allows the Superadmin)
export const isSuperAdmin = (req: any, res: Response, next: NextFunction) => {
  console.log("--- SUPERADMIN CHECK ---");

  if (req.user && req.user.role === "superadmin") {
    console.log("Result: Access Granted (Superadmin Only)");
    next();
  } else {
    console.log("DEBUG: Superadmin Access Denied. Role found:", req.user?.role);
    res.status(403).json({ 
      message: "Access Denied: This action requires Superadmin privileges." 
    });
  }
};