import { describe, expect, it } from "vitest"
import { challenges, reviewDecisions, submissions } from "../src/data/demo-data.js"
import {
  arbitrateChallenge,
  buildPayoutInstruction,
  createSubmissionManifest,
  validateChallenge,
  validateSubmissionPackage,
  weightedScore
} from "../src/lib/bounty-engine.js"

describe("bounty engine", () => {
  it("validates challenge configuration before accepting sponsor funds", () => {
    const validation = validateChallenge(challenges[0])

    expect(validation.valid).toBe(true)
    expect(validation.checks.every((check) => check.passed)).toBe(true)
  })

  it("builds a reproducible submission manifest", () => {
    const manifest = createSubmissionManifest(submissions[0])

    expect(manifest.submissionId).toBe("sub_biomarker_atlas")
    expect(manifest.artifacts.some((artifact) => artifact.type === "manifest")).toBe(true)
    expect(manifest.memberPayoutShares.reduce((sum, member) => sum + member.payoutSharePercent, 0)).toBe(100)
  })

  it("scores and arbitrates submissions with weighted criteria", () => {
    const challenge = challenges[0]
    const score = weightedScore(challenge.criteria, reviewDecisions[0])
    const result = arbitrateChallenge(challenge, submissions, reviewDecisions)

    expect(score).toBe(91.55)
    expect(result.winningSubmissionId).toBe("sub_biomarker_atlas")
    expect(result.checklist.every((item) => item.passed)).toBe(true)
  })

  it("rejects incomplete packages before payout", () => {
    const checks = validateSubmissionPackage(challenges[0], submissions[1])

    expect(checks.some((check) => check.label === "submission includes a manifest" && !check.passed)).toBe(true)
    expect(checks.some((check) => check.label === "submission has reproducibility command" && !check.passed)).toBe(true)
  })

  it("splits payout routes according to team shares and preserves total prize", () => {
    const payout = buildPayoutInstruction(challenges[0], submissions[0])

    expect(payout.status).toBe("pending_approval")
    expect(payout.routes.reduce((sum, route) => sum + route.amount.cents, 0)).toBe(challenges[0].prize.cents)
    expect(payout.releaseConditions.some((condition) => condition.includes("IP assignment"))).toBe(true)
  })
})
