import type { Request, Response } from "express";
import User from "../models/User.js";
import type { IUser } from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import Transaction from "../models/Transaction.js";

// Initialize Google OAuth2Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * UPDATED: Helper to create JWT including the role
 */
const createToken = (id: string, role: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing from the .env file");
  }
  // We now include the role so middleware can see it without a DB query
  return jwt.sign({ id, role }, secret, { expiresIn: "1d" });
};
/**
 * GOOGLE LOGIN (Updated)
 */
export const googleLogin = async (req: Request, res: Response) => {
  const { token } = req.body;
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: "Google Client ID not configured" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        Math.random().toString(36),
        salt,
      );

      user = await User.create({
        name: payload.name || "Google User",
        email: payload.email,
        googleId: payload.sub,
        password: hashedPassword,
        credits: 5,
        role: "user",
      });
    }

    // FIXED: Passing user.role to the token
    const appToken = createToken(user._id.toString(), user.role);

    return res.status(200).json({
      token: appToken,
      user: {
        id: user._id,
        name: user.name,
        credits: user.credits,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: "Google authentication failed" });
  }
};

export const facebookLogin = async (req: Request, res: Response) => {
  const { accessToken } = req.body;

  try {
    const url = `https://graph.facebook.com/v12.0/me?fields=id,name,email&access_token=${accessToken}`;
    const fbResponse = await axios.get(url);
    const { email, name, id } = fbResponse.data;

    let user = await User.findOne({ email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        Math.random().toString(36),
        salt,
      );

      user = await User.create({
        name,
        email,
        facebookId: id,
        password: hashedPassword,
        credits: 5,
        role: "user",
      });
    }

    // FIXED: Passing user.role to the token
    const appToken = createToken(user._id.toString(), user.role);

    return res.status(200).json({
      token: appToken,
      user: {
        id: user._id,
        name: user.name,
        credits: user.credits,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: "Facebook authentication failed" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, skillsToTeach, skillsToLearn } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      skillsToTeach,
      skillsToLearn,
      credits: 5,
      role: "user", // Default role
    });

    // FIXED: Passing user.role to the token
    const token = createToken(user._id.toString(), user.role);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        credits: user.credits,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    // FIXED: Passing user.role to the token
    const token = createToken(user._id.toString(), user.role);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        credits: user.credits,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};

/**
 * GET CURRENT USER DATA
 */
export const getMe = async (req: any, res: Response) => {
  try {
    const user = (await User.findById(req.user.id)
      .select("-password")
      .populate("enrolledCourses")
      .populate("completedCourses")) as IUser | null; // Added to keep frontend profile in sync
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user identity" });
  }
};

/**
 * GET DASHBOARD STATS (Solidified for Finished Lessons Logic)
 */
export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const user = (await User.findById(req.user.id)
      .populate({
        path: "enrolledCourses",
        select: "title description category instructor",
        populate: { path: "instructor", select: "name" },
      })
      .populate({
        path: "completedCourses", // NEW: Finished Lessons
        select: "title description category instructor",
        populate: { path: "instructor", select: "name" },
      })
      .populate("createdCourses")) as IUser | null;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      enrolled: user.enrolledCourses, // Active
      completed: user.completedCourses, // NEW: Finished
      teaching: user.createdCourses, // Mentor Studio
      credits: user.credits,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics" });
  }
};

// Get a single user's public profile
import mongoose from "mongoose";

export const getUserProfile = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined") {
      return res.status(400).json({ message: "No Mentor ID provided" });
    }

    // validation: Ensure the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Mentor ID format" });
    }

    const user = await User.findById(id).select(
      "name email credits role skillsToTeach skillsToLearn",
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "Mentor profile not found in database" });
    }

    res.json(user);
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { name, email, bio, skillsToTeach, skillsToLearn } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, bio, skillsToTeach, skillsToLearn },
      { new: true },
    ).select("-password");

    // We send back a new token if you want to refresh the frontend user state
    const token = createToken(user!._id.toString(), user!.role);

    res.status(200).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const getTransactionHistory = async (req: any, res: Response) => {
  try {
    // 2. CHECK: req.user.id must exist (provided by your 'protect' middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const history = await Transaction.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(history);
  } catch (err: any) {
    // 3. LOG THE ACTUAL ERROR: This will show in your terminal, not just the browser
    console.error("Transaction Fetch Error:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching history", error: err.message });
  }
};

export const purchaseCredits = async (req: any, res: Response) => {
  try {
    const { amount, price, bundleName } = req.body;
    const userId = req.user.id;

    // 1. Update User balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true },
    );

    // 2. Create Transaction Record
    await Transaction.create({
      user: userId,
      amount: amount,
      type: "bonus", // or 'purchase'
      description: `Purchased ${bundleName} Bundle`,
    });

    res.status(200).json({
      message: "Purchase successful!",
      newBalance: user?.credits,
    });
  } catch (error) {
    res.status(500).json({ message: "Payment failed to process" });
  }
};
