import express from 'express';
import { getMatches } from '../controllers/discoveryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get personalized matches based on user's skills
router.get('/matches', protect, getMatches);

export default router;