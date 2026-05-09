import { describe, expect, it } from "vitest"
import { challenges, reviewDecisions, submissions } from "../src/data/demo-data.js"
import { BountyService } from "../src/lib/bounty-service.js"

function createService() {
  return new BountyService({
    challenges: structuredClone(challenges),
    submissions: structuredClone(submissions),
    reviews: structuredClone(reviewDecisions)
  })
}

describe("bounty service", () => {
  it("renders sponsor dashboard rows for active challenges", () => {
    const service = createService()
    const dashboard = service.sponsorDashboard()

    expect(dashboard).toHaveLength(2)
    expect(dashboard[0].topScore).toBeGreaterThan(80)
  })

  it("advances challenge phases deterministically", () => {
    const service = createService()
    const challenge = service.advanceChallenge("challenge_climate_forecast")

    expect(challenge.phase).toBe("proposal_review")
  })

  it("creates payout instruction for arbitration winner", () => {
    const service = createService()
    const payout = service.buildPayout("challenge_biomarker_rna")

    expect(payout.submissionId).toBe("sub_biomarker_atlas")
    expect(payout.routes).toHaveLength(3)
  })
})
