import type { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

// This checks if the user is logged in
export const protect = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// This checks if the user has enough credits to learn
export const checkCredits = (req: any, res: Response, next: NextFunction) => {
  if (req.user.credits < 1) {
    return res.status(403).json({ message: "Insufficient credits. Please teach a skill to earn more!" });
  }
  next();
};