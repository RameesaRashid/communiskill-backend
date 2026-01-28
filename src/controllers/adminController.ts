import type { Request, Response } from "express";
import User from "../models/User.js";
import Course from "../models/Course.js";
import AuditLog from "../models/AuditLog.js"; // Ensure this model exists

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

export const adjustCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user?._id;

    if (!adminId) return res.status(401).json({ message: "Admin not authenticated" });

    const targetUser = await User.findById(userId);

    if (targetUser?.role === "superadmin") {
      return res.status(403).json({
        message: "Access Denied: You cannot modify the Superadmin's account.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true }
    );

    // LOG ACTION
    await AuditLog.create({
      adminId,
      targetId: userId,
      action: "CREDIT_ADJUSTMENT",
      details: `Adjusted credits by ${amount}. Reason: ${reason || "No reason provided"}`,
    });

    res.status(200).json({
      message: `Credits adjusted for ${user?.name}`,
      newBalance: user?.credits,
    });
  } catch (error) {
    res.status(500).json({ message: "Admin credit adjustment failed" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const adminDeleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    // FIX: Match the logic you used in updateUserRole to be safe
    const adminId = req.user?._id || req.user?.id; 

    if (!adminId) {
      return res.status(401).json({ message: "Admin authentication context missing" });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Perform deletion
    await Course.findByIdAndDelete(id);

    // Remove course from instructor's createdCourses array
    if (course.instructor) {
      await User.findByIdAndUpdate(course.instructor, {
        $pull: { createdCourses: id },
      });
    }

    // LOG ACTION
    // Ensure AuditLog schema allows adminId to be a string or ObjectId
    await AuditLog.create({
      adminId,
      action: "COURSE_DELETE",
      details: `Deleted course: ${course.title} (ID: ${id})`,
    });

    res.status(200).json({ message: "Course deleted by Admin successfully" });
  } catch (error: any) {
    console.error("DELETE COURSE ERROR:", error); // CRUCIAL: Always log the error on the server
    res.status(500).json({ message: "Admin delete failed", error: error.message });
  }
};

export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    const courseCount = await Course.countDocuments();
    const totalCredits = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$credits" } } },
    ]);

    res.status(200).json({
      users: userCount,
      courses: courseCount,
      circulatingCredits: totalCredits[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, newRole } = req.body;
    
    // Use optional chaining and check for both _id or id
    const adminId = req.user?._id || req.user?.id; 

    if (!adminId) {
      return res.status(401).json({ message: "Admin context missing" });
    }

    if (newRole === "superadmin") {
      return res.status(403).json({ message: "Forbidden: Change via DB only." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    await AuditLog.create({
      adminId,
      targetId: userId,
      action: "ROLE_UPDATE",
      details: `Changed role to ${newRole}`,
    });

    res.status(200).json({ message: `Role updated to ${newRole}`, user });
  } catch (error) {
    console.error("Role update error:", error); // Add this to see the actual error in console
    res.status(500).json({ message: "Role update failed" });
  }
};

// NEW: Fetch all logs for the Superadmin tab
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await AuditLog.find()
      .populate("adminId", "name email")
      .populate("targetId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};