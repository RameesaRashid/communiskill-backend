import { type Response, type NextFunction } from "express";
import Course from "../models/Course.js";

export const isInstructor = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
       return next(); 
    }

    const course = await (Course as any).findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied: You are not the instructor" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
};