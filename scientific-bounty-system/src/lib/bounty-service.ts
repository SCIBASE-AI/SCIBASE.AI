import type { Challenge, ReviewDecision, Submission } from "../types.js"
import {
  arbitrateChallenge,
  buildPayoutInstruction,
  createSubmissionManifest,
  nextPhase,
  validateChallenge,
  validateSubmissionPackage
} from "./bounty-engine.js"

export interface BountyStore {
  challenges: Challenge[]
  submissions: Submission[]
  reviews: ReviewDecision[]
}

export class BountyService {
  constructor(private readonly store: BountyStore) {}

  listChallenges() {
    return this.store.challenges
  }

  listSubmissions(challengeId?: string) {
    return challengeId
      ? this.store.submissions.filter((submission) => submission.challengeId === challengeId)
      : this.store.submissions
  }

  getChallenge(challengeId: string) {
    const challenge = this.store.challenges.find((candidate) => candidate.id === challengeId)
    if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`)
    return challenge
  }

  getSubmission(submissionId: string) {
    const submission = this.store.submissions.find((candidate) => candidate.id === submissionId)
    if (!submission) throw new Error(`Unknown submission: ${submissionId}`)
    return submission
  }

  createChallenge(input: Challenge) {
    const validation = validateChallenge(input)
    if (!validation.valid) {
      throw new Error(`Invalid challenge: ${validation.checks.filter((check) => !check.passed).map((check) => check.label).join(", ")}`)
    }
    this.store.challenges.push(input)
    return input
  }

  submitPackage(input: Submission) {
    const challenge = this.getChallenge(input.challengeId)
    const checks = validateSubmissionPackage(challenge, input)
    this.store.submissions.push(input)
    return {
      submission: input,
      manifest: createSubmissionManifest(input),
      checks
    }
  }

  advanceChallenge(challengeId: string) {
    const challenge = this.getChallenge(challengeId)
    challenge.phase = nextPhase(challenge.phase)
    return challenge
  }

  arbitrate(challengeId: string) {
    const challenge = this.getChallenge(challengeId)
    return arbitrateChallenge(
      challenge,
      this.listSubmissions(challengeId),
      this.store.reviews
    )
  }

  buildPayout(challengeId: string, submissionId?: string) {
    const result = this.arbitrate(challengeId)
    const winnerId = submissionId ?? result.winningSubmissionId
    if (!winnerId) throw new Error("No winning submission is available for payout.")
    const challenge = this.getChallenge(challengeId)
    const submission = this.getSubmission(winnerId)
    return buildPayoutInstruction(challenge, submission)
  }

  sponsorDashboard() {
    return this.store.challenges.map((challenge) => {
      const submissions = this.listSubmissions(challenge.id)
      const arbitration = submissions.length > 0 ? this.arbitrate(challenge.id) : null
      return {
        challengeId: challenge.id,
        title: challenge.title,
        sponsor: challenge.sponsor,
        domain: challenge.domain,
        phase: challenge.phase,
        prize: challenge.prize,
        submissions: submissions.length,
        topScore: arbitration?.rankedSubmissions[0]?.weightedScore ?? 0,
        winningSubmissionId: arbitration?.winningSubmissionId ?? null
      }
    })
  }
}
