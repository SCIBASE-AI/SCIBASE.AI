import { Schema, model, Document } from 'mongoose';

export interface IBounty extends Document {
  title: string;
  description: string;
  scientificContext: string;
  deliverables: string[];
  evaluationCriteria: string;
  timeline: Date;
  prizeAmount: number;
  payoutSchedule: string;
  isPublic: boolean;
  status: 'open' | 'in_review' | 'completed' | 'cancelled';
  postedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bountySchema = new Schema<IBounty>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  scientificContext: { type: String, required: true },
  deliverables: [{ type: String }],
  evaluationCriteria: { type: String, required: true },
  timeline: { type: Date, required: true },
  prizeAmount: { type: Number, required: true },
  payoutSchedule: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ['open', 'in_review', 'completed', 'cancelled'], default: 'open' },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default model<IBounty>('Bounty', bountySchema);
