
import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  action: "CREDIT_ADJUSTMENT" | "ROLE_CHANGE" | "COURSE_DELETE";
  details: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetId: { type: Schema.Types.ObjectId, ref: "User" }, // Can be null for course deletes
  action: { type: String, required: true },
  details: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);