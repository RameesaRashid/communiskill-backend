import type { Response } from "express";
import Course from "../models/Course.js";
import User, { type IUser } from "../models/User.js";
import Transaction from "../models/Transaction.js";

// 1. Mentor creates a course
export const createCourse = async (req: any, res: Response) => {
  try {
    if (req.user.role === "admin" || req.user.role === "superadmin") {
      return res.status(403).json({
        message:
          "Admins are for platform management only and cannot create courses.",
      });
    }

    const { title, description, category, lessons, thumbnail } = req.body;

    const newCourse = await Course.create({
      title,
      description,
      category,
      thumbnail,
      instructor: req.user.id,
      lessons: lessons || [], // Successfully uses the extracted 'lessons' variable
      cost: 1, // Standard cost
    });

    // Update user's teaching list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { createdCourses: newCourse._id },
    });

    res.status(201).json(newCourse);
  } catch (error: any) {
    console.error("Create Course Error:", error.message);
    res
      .status(500)
      .json({ message: "Error creating course", error: error.message });
  }
};

// 2. Learner enrollees (The Credit Swap)
export const enrollInCourse = async (req: any, res: Response) => {
  try {
    if (req.user.role === "admin" || req.user.role === "superadmin") {
      return res.status(403).json({
        message:
          "Admin accounts cannot enroll in courses. Please use a standard user account to learn.",
      });
    }
    const courseId = req.params.id;
    const userId = req.user.id;

    // FIXED: Added type casting 'as IUser | null' to resolve property errors
    const user = (await (User as any).findById(userId)) as IUser | null;
    const course = await (Course as any).findById(courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.instructor.toString() === userId) {
      return res
        .status(400)
        .json({ message: "You cannot enroll in your own course." });
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent double enrollment or enrolling in finished courses
    const isAlreadyEnrolled = user.enrolledCourses.includes(course._id as any);
    const isAlreadyCompleted = user.completedCourses.includes(
      course._id as any,
    );

    if (isAlreadyEnrolled || isAlreadyCompleted) {
      return res.status(400).json({
        message: "You are already enrolled in or have finished this course",
      });
    }

    // CREDIT LOGIC
    if (user.credits < 1) {
      return res
        .status(403)
        .json({ message: "Insufficient credits! Teach a skill to earn more." });
    }

    // Deduct 1 credit from Learner
    user.credits -= 1;
    user.enrolledCourses.push(course._id as any);
    await user.save();

    // After user.save()...
    await Transaction.create({
      user: userId,
      amount: -1,
      type: "spend",
      description: `Enrolled in ${course.title}`,
    });

    // Add Learner to Course list
    course.enrolledStudents.push(userId);
    await course.save();

    res.status(200).json({
      message: "Enrolled successfully",
      remainingCredits: user.credits,
    });
  } catch (error) {
    res.status(500).json({ message: "Enrollment failed" });
  }
};

// 3. Complete Course (Logic for Credit Reward & Moving to Finished)
export const completeCourseSession = async (req: any, res: Response) => {
  try {
    const courseId = req.params.id || req.body.courseId;
    const learnerId = req.user.id;

    // 1. Find the course
    const course = await (Course as any).findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const mentorId = course.instructor;

    // 2. Security Check: Only allow if learner is actually enrolled
    const learner = await User.findById(learnerId);
    if (!learner?.enrolledCourses.includes(courseId as any)) {
      return res
        .status(400)
        .json({ message: "You are not enrolled in this course" });
    }

    // 3. UPDATE LEARNER: Move from enrolled to completed
    await User.findByIdAndUpdate(learnerId, {
      $pull: { enrolledCourses: courseId },
      $addToSet: { completedCourses: courseId },
    });

    // NEW: Add a "Completion" record for the Learner (0 credit change, but shows in history)
    await Transaction.create({
      user: learnerId,
      amount: 0,
      type: "bonus", // Or a new type 'completion'
      description: `Completed Course: ${course.title}`,
    });

    // 4. UPDATE MENTOR: Reward with 2 credits
    await User.findByIdAndUpdate(mentorId, {
      $inc: { credits: 2 },
    });

    // 5. UPDATE MENTOR TRANSACTION: Specific description
    await Transaction.create({
      user: mentorId,
      amount: 2,
      type: "earn",
      description: `Reward for ${learner.name} completing: ${course.title}`,
    });

    res.status(200).json({
      message: "Congratulations! Course finished. Mentor rewarded.",
    });
  } catch (error: any) {
    console.error("Completion Logic Error:", error.message);
    res.status(500).json({ message: "Error during completion reward logic" });
  }
};

export const getAllCourses = async (req: any, res: Response) => {
  try {
    let query = {};

    if (req.user && req.user.id) {
      // Don't show the mentor's own courses in Discovery
      query = { instructor: { $ne: req.user.id } };
    }

    const courses = await (Course as any)
      .find(query)
      .populate("instructor", "name _id");

    res.status(200).json(courses);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ message: "Error fetching courses" });
  }
};

export const getCourseById = async (req: any, res: Response) => {
  try {
    const course = await (Course as any)
      .findById(req.params.id)
      .populate("instructor", "_id name");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course details" });
  }
};

// Update/Edit Course Details

export const updateCourse = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, lessons, thumbnail } = req.body;

    const updatedCourse = await (Course as any).findOneAndUpdate(
      { _id: id, instructor: req.user.id }, // Security: Only the instructor can edit
      { title, description, category, lessons, thumbnail },
      { new: true, runValidators: true },
    );

    if (!updatedCourse) {
      return res
        .status(404)
        .json({ message: "Course not found or unauthorized" });
    }

    res.status(200).json(updatedCourse);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error updating course", error: error.message });
  }
};

export const deleteCourse = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Security: Only delete if the course exists AND the requester is the instructor
    const course = await (Course as any).findOneAndDelete({
      _id: id,
      instructor: req.user.id,
    });

    if (!course) {
      return res
        .status(404)
        .json({ message: "Course not found or unauthorized" });
    }

    // Also remove the course from the User's createdCourses array
    await (User as any).findByIdAndUpdate(req.user.id, {
      $pull: { createdCourses: id },
    });

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error deleting course", error: error.message });
  }
};

// Get all courses created by a specific instructor
export const getCoursesByInstructor = async (req: any, res: Response) => {
  try {
    const { instructorId } = req.params;

    // Using (Course as any) ensures TypeScript doesn't block the query
    // while you're still refining your Model types.
    const courses = await (Course as any)
      .find({ instructor: instructorId })
      .populate("instructor", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(courses);
  } catch (err: any) {
    res.status(500).json({
      message: "Error fetching instructor courses",
      error: err.message,
    });
  }
};
