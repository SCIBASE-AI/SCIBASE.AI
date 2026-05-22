import assert from "node:assert/strict"
import { sampleRecusalPacket } from "./sample-data.js"
import {
  digestRecord,
  evaluatePeerReviewRecusals,
  renderStewardPacketMarkdown,
  renderSummarySvg,
} from "./index.js"

const result = evaluatePeerReviewRecusals(sampleRecusalPacket)

assert.equal(result.summary.totalAssignments, 5)
assert.equal(result.summary.allow, 1)
assert.equal(result.summary.stewardReview, 1)
assert.equal(result.summary.recuse, 3)
assert.equal(result.summary.criticalFindings, 3)
assert.equal(result.summary.reputationWeightAtRisk, 0.92)
assert.equal(result.stewardQueue.length, 4)

const clean = result.decisions.find((decision) => decision.assignmentId === "assign-lina")
assert.equal(clean.decision, "allow")
assert.deepEqual(clean.blockers, [])
assert.ok(clean.warnings.includes("relationship:prior_public_comment"))

const sameLab = result.decisions.find((decision) => decision.assignmentId === "assign-mateo")
assert.equal(sameLab.decision, "recuse")
assert.ok(sameLab.blockers.includes("hard_conflict:same_lab"))
assert.ok(sameLab.blockers.includes("hard_conflict:mentor_student"))

const coauthor = result.decisions.find((decision) => decision.assignmentId === "assign-nadia")
assert.equal(coauthor.decision, "steward_review")
assert.ok(coauthor.warnings.includes("relationship:coauthorship"))
assert.ok(coauthor.warnings.includes("conflict_disclosure_stale"))

const grant = result.decisions.find((decision) => decision.assignmentId === "assign-oscar")
assert.equal(grant.decision, "recuse")
assert.ok(grant.blockers.includes("hard_conflict:shared_grant"))
assert.ok(grant.warnings.includes("relationship:shared_institution"))

const inactive = result.decisions.find((decision) => decision.assignmentId === "assign-priya")
assert.equal(inactive.decision, "recuse")
assert.ok(inactive.blockers.includes("reviewer_inactive"))

const markdown = renderStewardPacketMarkdown(result)
assert.match(markdown, /Peer Review Recusal Steward Packet/)
assert.match(markdown, /assign-oscar/)
assert.doesNotMatch(markdown, /Ada Nguyen|Ben Ortiz|Cora Stein|Lina Park|Mateo Silva|Nadia Iqbal|Oscar Moreno|Priya Shah/)

const svg = renderSummarySvg(result)
assert.match(svg, /<svg/)
assert.match(svg, /Peer Review Recusal Guard/)
assert.match(svg, /recuse/)

assert.equal(result.packetDigest.length, 64)
assert.equal(digestRecord({ id: "assign-lina" }).length, 64)

console.log("peer-review-recusal-guard tests passed")
