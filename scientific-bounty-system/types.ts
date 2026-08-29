export type BountyStatus = 'DRAFT' | 'ACTIVE' | 'EVALUATION' | 'RESOLVED' | 'DISPUTED' | 'CANCELLED';
export type PayoutModel = 'WINNER_TAKES_ALL' | 'MILESTONE_BASED' | 'PROPORTIONAL_SPLIT';

export interface Milestone {
  id: string;
  title: string;
  percentage: number;
  deadline: string;
  isCompleted: boolean;
}

export interface BountyChallenge {
  id: string;
  title: string;
  description: string;
  sponsorId: string;
  escrowAmountUsd: number;
  payoutModel: PayoutModel;
  milestones: Milestone[];
  benchmarkMetric: string;
  status: BountyStatus;
  createdAt: string;
  deadline: string;
}

export interface Submission {
  id: string;
  bountyId: string;
  solverId: string;
  artifactHash: string; // SHA-256 commit hash of model/data
  benchmarkScore: number;
  peerReviewScore: number;
  finalRank?: number;
  payoutAwardedUsd?: number;
  submittedAt: string;
}
