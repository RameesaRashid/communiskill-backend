import express from "express";
import {
  register,
  login,
  getMe,
  getDashboardStats,
  googleLogin,
  facebookLogin,
  getUserProfile, // 1. Add this import
  updateProfile,
  getTransactionHistory,
  purchaseCredits,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { migrateExistingUsers } from "../scripts/migrateTransactions.js";

const router = express.Router();


router.get("/me", protect, getMe);
router.post("/register", register);
router.post("/login", login);
router.get("/dashboard-stats", protect, getDashboardStats);

router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);
router.put("/update-profile", protect, updateProfile);
router.get("/transactions", protect, getTransactionHistory); 

// router.get('/run-migration', protect, migrateExistingUsers);
router.post('/purchase-credits', protect, purchaseCredits);

// must be last
router.get("/:id", getUserProfile);

export default router;
