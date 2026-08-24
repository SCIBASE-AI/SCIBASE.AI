import { Schema, model, Document } from 'mongoose';

export interface ISubmission extends Document {
  bountyId: Schema.Types.ObjectId;
  submittedBy: Schema.Types.ObjectId;
  proposal: string;
  deliverablesManifest: string[];
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>({
  bountyId: { type: Schema.Types.ObjectId, ref: 'Bounty', required: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  proposal: { type: String, required: true },
  deliverablesManifest: [{ type: String }],
  status: { type: String, enum: ['submitted', 'under_review', 'accepted', 'rejected'], default: 'submitted' },
  isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

export default model<ISubmission>('Submission', submissionSchema);
