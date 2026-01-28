import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const migrateExistingUsers = async (req: any, res: any) => {
  try {
    const users = await User.find();
    
    for (const user of users) {
      // Check if user already has a welcome transaction to avoid duplicates
      const existing = await Transaction.findOne({ 
        user: user._id, 
        description: 'Initial Balance Migration' 
      });

      if (!existing) {
        await Transaction.create({
          user: user._id,
          amount: user.credits, // Records their current balance as the starting point
          type: 'bonus',
          description: 'Initial Balance Migration',
          createdAt: user.createdAt || new Date()
        });
      }
    }
    res.status(200).json({ message: "Migration complete!" });
  } catch (err) {
    res.status(500).json({ message: "Migration failed" });
  }
};