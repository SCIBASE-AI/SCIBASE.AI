export type Currency = "USD" | "EUR"

export type ChallengeDomain = "biotech" | "materials" | "climate" | "ml" | "chemistry" | "quantum"

export type ChallengeVisibility = "public" | "private" | "invite_only"

export type ChallengePhase = "draft" | "open" | "proposal_review" | "prototype" | "final_review" | "awarded" | "cancelled"

export type SubmissionStatus = "draft" | "submitted" | "needs_revision" | "shortlisted" | "rejected" | "winner"

export type IpTerm = "solver_retains_until_paid" | "sponsored_transfer_on_payout" | "open_source"

export type PayoutStatus = "escrowed" | "pending_approval" | "approved" | "released" | "disputed" | "cancelled"

export interface Money {
  currency: Currency
  cents: number
}

export interface ChallengeMilestone {
  id: string
  title: string
  dueAt: string
  payoutPercent: number
  requiredDeliverables: string[]
}

export interface EvaluationCriterion {
  id: string
  label: string
  description: string
  weight: number
}

export interface Challenge {
  id: string
  title: string
  sponsor: string
  domain: ChallengeDomain
  visibility: ChallengeVisibility
  phase: ChallengePhase
  problemStatement: string
  scientificContext: string
  prize: Money
  escrowed: Money
  timeline: {
    opensAt: string
    proposalDueAt: string
    finalDueAt: string
  }
  ipTerm: IpTerm
  ndaRequired: boolean
  milestones: ChallengeMilestone[]
  criteria: EvaluationCriterion[]
  templates: string[]
}

export interface SubmissionArtifact {
  id: string
  type: "model" | "dataset" | "whitepaper" | "code" | "notebook" | "manifest"
  name: string
  uri: string
  sha256: string
  reproducibilityCommand?: string
}

export interface Submission {
  id: string
  challengeId: string
  teamName: string
  members: Array<{
    userId: string
    displayName: string
    role: string
    payoutSharePercent: number
  }>
  status: SubmissionStatus
  submittedAt: string
  summary: string
  artifacts: SubmissionArtifact[]
  auditLog: Array<{
    at: string
    actor: string
    action: string
  }>
  scores: Record<string, number>
}

export interface ReviewDecision {
  submissionId: string
  reviewerId: string
  criterionScores: Record<string, number>
  notes: string
  recommendedStatus: SubmissionStatus
}

export interface ArbitrationResult {
  challengeId: string
  winningSubmissionId?: string
  rankedSubmissions: Array<{
    submissionId: string
    weightedScore: number
    status: SubmissionStatus
  }>
  checklist: Array<{
    label: string
    passed: boolean
    evidence: string
  }>
  requiresHumanApproval: boolean
  reason: string
}

export interface PayoutRoute {
  recipientId: string
  displayName: string
  amount: Money
  rail: "bank_transfer" | "stripe_connect" | "institutional_invoice"
}

export interface PayoutInstruction {
  id: string
  challengeId: string
  submissionId: string
  status: PayoutStatus
  amount: Money
  routes: PayoutRoute[]
  ipTerm: IpTerm
  releaseConditions: string[]
}
