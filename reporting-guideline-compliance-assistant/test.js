import test from "node:test"
import assert from "node:assert/strict"
import { manuscripts } from "./sample-data.js"
import {
  analyzeBatch,
  analyzeReportingGuidelineCompliance,
  renderMarkdownReport,
  renderSvgSummary,
} from "./index.js"

test("flags missing CONSORT allocation concealment details", () => {
  const packet = analyzeReportingGuidelineCompliance(manuscripts[0])
  const allocation = packet.findings.find(
    (finding) => finding.id === "consort-allocation"
  )

  assert.equal(allocation.status, "fail")
  assert.equal(allocation.severity, "high")
  assert.match(allocation.reviewerAction, /allocation concealment/i)
})

test("recommends guideline citations for failed checklist items", () => {
  const packet = analyzeReportingGuidelineCompliance(manuscripts[1])

  assert.equal(packet.citationRecommendations[0].guideline, "PRISMA")
  assert.match(packet.citationRecommendations[0].apa, /PRISMA 2020/)
})

test("scores clean checklist evidence higher than missing evidence", () => {
  const cleanTrial = {
    ...manuscripts[0],
    sections: {
      methods:
        "Adults were randomized with allocation concealment. The trial was registered as NCT01234567.",
      results:
        "A participant flow diagram reports records screened, excluded, randomized, and analyzed.",
      discussion:
        "Data availability and code availability statements are included in the supplement.",
    },
  }

  const cleanPacket = analyzeReportingGuidelineCompliance(cleanTrial)
  const originalPacket = analyzeReportingGuidelineCompliance(manuscripts[0])

  assert.ok(cleanPacket.readinessScore > originalPacket.readinessScore)
  assert.equal(cleanPacket.readiness, "ready")
})

test("renders reviewer markdown and svg artifacts", () => {
  const batch = analyzeBatch(manuscripts)
  const markdown = renderMarkdownReport(batch)
  const svg = renderSvgSummary(batch)

  assert.match(markdown, /Reporting Guideline Compliance Packet/)
  assert.match(markdown, /Reviewer Actions/)
  assert.match(svg, /<svg/)
  assert.match(svg, /Average readiness score/)
})
