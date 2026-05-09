import { describe, expect, it } from "vitest"
import { corpus, projects } from "../src/data/demo-data.js"
import { AssistantService } from "../src/lib/assistant-service.js"
import { findResearchGaps } from "../src/lib/gap-finder.js"
import { generatePeerReview } from "../src/lib/peer-review.js"
import { runReproducibilityChecks } from "../src/lib/reproducibility.js"

describe("AI research assistant suite", () => {
  it("generates domain-specific peer review findings", () => {
    const report = generatePeerReview(projects[0], "2026-05-09T00:00:00.000Z")

    expect(report.template).toContain("Ethics statement")
    expect(report.modelProfile.trainedOn).toContain("OpenReview-style review rubrics")
    expect(report.coveredSignals).toContain("claims_vs_evidence")
    expect(report.findings.some((finding) => finding.category === "data_availability")).toBe(true)
    expect(report.score).toBeLessThan(100)
  })

  it("calculates reproducibility confidence from project artifacts", () => {
    const report = runReproducibilityChecks(projects[0])

    expect(report.confidenceScore).toBe(100)
    expect(report.status).toBe("passed")
    expect(report.sandbox.outputConsistency).toBe("consistent")
    expect(report.previousAttempts[0]?.status).toBe("passed")
    expect(report.recommendedCommand).toContain("python reproduce.py")
  })

  it("finds research gaps from overlapping corpus signals", () => {
    const gaps = findResearchGaps(projects[0], corpus)

    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps[0].noveltyScore).toBeGreaterThan(70)
    expect(gaps[0].evidencePaperIds.length).toBe(1)
    expect(gaps.some((gap) => gap.signal === "negative_result_follow_up")).toBe(true)
  })

  it("builds a combined dashboard readiness score", () => {
    const service = new AssistantService({ projects, corpus })
    const dashboard = service.projectDashboard("project_organoid_response")

    expect(dashboard.review.findings.length).toBeGreaterThan(0)
    expect(dashboard.reproducibility.status).toBe("passed")
    expect(dashboard.readinessScore).toBeGreaterThan(70)
  })
})
