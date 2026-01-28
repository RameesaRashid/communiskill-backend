import express from 'express';
import { adjustCredits, adminDeleteCourse, getAllUsers, getAuditLogs, getPlatformStats, updateUserRole } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isSuperAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Only Superadmins/Admins can hit this

router.get('/users', protect, isAdmin, getAllUsers);
router.get('/stats', protect, isAdmin, getPlatformStats); 
router.patch('/adjust-credits', protect, isAdmin, adjustCredits);
router.patch('/update-role', protect, isSuperAdmin, updateUserRole);
router.delete('/delete-course/:id', protect, isAdmin, adminDeleteCourse);

router.get("/logs", protect, isSuperAdmin, getAuditLogs);

export default router;