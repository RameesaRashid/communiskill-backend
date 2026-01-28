import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  amount: number; // e.g., +2 or -1
  type: 'earn' | 'spend' | 'bonus';
  description: string; // e.g., "Enrolled in React Course"
  createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['earn', 'spend', 'bonus'], required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);