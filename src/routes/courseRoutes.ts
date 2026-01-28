import express from 'express';
// 1. Add 'getCoursesByInstructor' to your named imports
import { 
  createCourse, 
  enrollInCourse, 
  getAllCourses, 
  getCourseById, 
  updateCourse,
  getCoursesByInstructor, // Add this
  completeCourseSession 
} from '../controllers/courseController.js';
import { protect } from '../middleware/auth.js';
import { isInstructor } from '../middleware/isInstructor.js';

const router = express.Router();

router.get('/all', getAllCourses);
router.get('/:id', getCourseById);

// 2. Remove 'courseController.' and just use the function name
router.get('/instructor/:instructorId', getCoursesByInstructor);

router.post('/create', protect, isInstructor, createCourse);
router.post('/enroll/:id', protect, enrollInCourse);
router.post('/complete/:id', protect, completeCourseSession);
router.put("/:id", protect, isInstructor, updateCourse);

export default router;