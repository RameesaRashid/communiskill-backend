import mongoose, { Schema, Document } from "mongoose";

interface ILesson {
  title: string;
  videoUrl?: string;
  content?: string; // Markdown or text
  duration?: string;
}


const CourseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  thumbnail: {
    type: String,
    default:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop",
  },
  category: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Referencing, not defining
  enrolledStudents: [{ type: Schema.Types.ObjectId, ref: "User" }],
  lessons: [
    {
      title: { type: String, required: true },
      videoUrl: { type: String },
      content: { type: String },
      duration: { type: String },
    },
  ],
  cost: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
