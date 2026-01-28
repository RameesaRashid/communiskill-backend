import mongoose, { Schema, Document, Types } from 'mongoose';
import { Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  googleId?: string;
  facebookId?: string;
  credits: number;
  role: 'user' | 'admin' | 'superadmin';
  enrolledCourses: Types.ObjectId[];
  completedCourses: Types.ObjectId[];
  createdCourses: Types.ObjectId[];
  skillsToTeach: {
    skillName: string;
    proficiency: 'Beginner' | 'Intermediate' | 'Expert';
  }[];
  skillsToLearn: string[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },

  credits: { type: Number, default: 5 },

  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },

  skillsToTeach: [{
    skillName: String,
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
    },
  }],
  skillsToLearn: [String],

  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  completedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  createdCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],

  createdAt: { type: Date, default: Date.now },
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
