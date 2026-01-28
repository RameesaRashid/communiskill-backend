import type { Request, Response } from 'express';
import User from '../models/User.js';

export const getMatches = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const currentUser = await User.findById(userId);

    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // The Logic: Find users who TEACH what I want to LEARN
    const matches = await User.find({
      _id: { $ne: userId }, // Don't match with myself
      "skillsToTeach.skillName": { $in: currentUser.skillsToLearn }
    }).select('name email skillsToTeach credits');

    // Enhanced Logic: Highlight 'Reciprocal Matches' 
    // (Users who also want to learn what I teach)
    const enhancedMatches = matches.map(match => {
      const isReciprocal = match.skillsToLearn?.some(skill => 
        currentUser.skillsToTeach.map(s => s.skillName).includes(skill)
      );
      return { ...match.toObject(), reciprocal: isReciprocal };
    });

    res.status(200).json(enhancedMatches);
  } catch (error) {
    res.status(500).json({ message: "Error fetching matches" });
  }
};