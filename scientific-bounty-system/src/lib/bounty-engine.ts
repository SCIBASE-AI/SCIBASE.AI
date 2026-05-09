import type {
  ArbitrationResult,
  Challenge,
  ChallengePhase,
  EvaluationCriterion,
  PayoutInstruction,
  PayoutRoute,
  ReviewDecision,
  Submission,
  SubmissionArtifact
} from "../types.js"
import { money, splitMoneyByPercent } from "./money.js"

export class BountyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BountyError"
  }
}

export function validateChallenge(challenge: Challenge) {
  const totalWeight = challenge.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const totalMilestones = challenge.milestones.reduce((sum, milestone) => sum + milestone.payoutPercent, 0)

  return {
    valid: Math.abs(totalWeight - 1) < 0.001 && totalMilestones === 100 && challenge.escrowed.cents >= challenge.prize.cents,
    checks: [
      {
        label: "criteria weights sum to 1",
        passed: Math.abs(totalWeight - 1) < 0.001,
        evidence: totalWeight.toFixed(3)
      },
      {
        label: "milestone payouts sum to 100",
        passed: totalMilestones === 100,
        evidence: `${totalMilestones}%`
      },
      {
        label: "prize is fully escrowed",
        passed: challenge.escrowed.cents >= challenge.prize.cents,
        evidence: `${challenge.escrowed.cents}/${challenge.prize.cents}`
      }
    ]
  }
}

export function createSubmissionManifest(submission: Submission) {
  const artifactLines = submission.artifacts.map((artifact) => ({
    id: artifact.id,
    type: artifact.type,
    name: artifact.name,
    uri: artifact.uri,
    sha256: artifact.sha256,
    reproducibilityCommand: artifact.reproducibilityCommand ?? null
  }))

  return {
    submissionId: submission.id,
    teamName: submission.teamName,
    generatedAt: new Date().toISOString(),
    memberPayoutShares: submission.members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      payoutSharePercent: member.payoutSharePercent
    })),
    artifacts: artifactLines,
    auditLog: submission.auditLog
  }
}

export function validateSubmissionPackage(challenge: Challenge, submission: Submission) {
  const artifactTypes = new Set<SubmissionArtifact["type"]>(submission.artifacts.map((artifact) => artifact.type))
  const hasManifest = artifactTypes.has("manifest")
  const hasRunnableArtifact = submission.artifacts.some((artifact) => Boolean(artifact.reproducibilityCommand))
  const payoutShareTotal = submission.members.reduce((sum, member) => sum + member.payoutSharePercent, 0)
  const requiredFinalDeliverables = challenge.milestones.at(-1)?.requiredDeliverables.length ?? 0

  return [
    {
      label: "team payout shares sum to 100",
      passed: payoutShareTotal === 100,
      evidence: `${payoutShareTotal}%`
    },
    {
      label: "submission includes a manifest",
      passed: hasManifest,
      evidence: hasManifest ? "manifest artifact present" : "missing manifest artifact"
    },
    {
      label: "submission has reproducibility command",
      passed: hasRunnableArtifact,
      evidence: hasRunnableArtifact ? "runnable artifact present" : "no reproducibility command"
    },
    {
      label: "challenge has final deliverable list",
      passed: requiredFinalDeliverables > 0,
      evidence: `${requiredFinalDeliverables} deliverables required`
    }
  ]
}

export function weightedScore(criteria: EvaluationCriterion[], decision: ReviewDecision): number {
  return Number(criteria.reduce((score, criterion) => {
    return score + (decision.criterionScores[criterion.id] ?? 0) * criterion.weight
  }, 0).toFixed(2))
}

export function arbitrateChallenge(
  challenge: Challenge,
  submissions: Submission[],
  reviews: ReviewDecision[]
): ArbitrationResult {
  const challengeChecks = validateChallenge(challenge).checks
  const ranked = submissions
    .filter((submission) => submission.challengeId === challenge.id)
    .map((submission) => {
      const submissionReviews = reviews.filter((review) => review.submissionId === submission.id)
      const score = submissionReviews.length === 0
        ? 0
        : submissionReviews.reduce((sum, review) => sum + weightedScore(challenge.criteria, review), 0) / submissionReviews.length
      return {
        submissionId: submission.id,
        weightedScore: Number(score.toFixed(2)),
        status: submission.status
      }
    })
    .sort((left, right) => right.weightedScore - left.weightedScore)

  const winningSubmissionId = ranked[0]?.weightedScore >= 80 ? ranked[0].submissionId : undefined
  const winner = submissions.find((submission) => submission.id === winningSubmissionId)
  const packageChecks = winner ? validateSubmissionPackage(challenge, winner) : []
  const checklist = [...challengeChecks, ...packageChecks]
  const allChecksPassed = checklist.every((item) => item.passed)

  return {
    challengeId: challenge.id,
    winningSubmissionId: allChecksPassed ? winningSubmissionId : undefined,
    rankedSubmissions: ranked,
    checklist,
    requiresHumanApproval: true,
    reason: allChecksPassed
      ? "Winning package passed automated validation and is ready for sponsor approval."
      : "Automated validation found issues that must be resolved before payout."
  }
}

export function nextPhase(current: ChallengePhase): ChallengePhase {
  const order: ChallengePhase[] = ["draft", "open", "proposal_review", "prototype", "final_review", "awarded"]
  const index = order.indexOf(current)
  if (index < 0 || index === order.length - 1) return current
  return order[index + 1]
}

export function buildPayoutInstruction(challenge: Challenge, submission: Submission): PayoutInstruction {
  const routes: PayoutRoute[] = submission.members.map((member) => ({
    recipientId: member.userId,
    displayName: member.displayName,
    amount: splitMoneyByPercent(challenge.prize, member.payoutSharePercent),
    rail: challenge.ipTerm === "sponsored_transfer_on_payout" ? "bank_transfer" : "stripe_connect"
  }))

  const roundedTotal = routes.reduce((sum, route) => sum + route.amount.cents, 0)
  const delta = challenge.prize.cents - roundedTotal
  if (delta !== 0 && routes[0]) {
    routes[0].amount = money(routes[0].amount.cents + delta, challenge.prize.currency)
  }

  return {
    id: `payout_${challenge.id}_${submission.id}`,
    challengeId: challenge.id,
    submissionId: submission.id,
    status: "pending_approval",
    amount: challenge.prize,
    routes,
    ipTerm: challenge.ipTerm,
    releaseConditions: [
      "Sponsor approves arbitration result",
      "Submission manifest hashes match uploaded artifacts",
      challenge.ipTerm === "sponsored_transfer_on_payout"
        ? "IP assignment is signed before payout release"
        : "IP terms acknowledged by solver team"
    ]
  }
}
