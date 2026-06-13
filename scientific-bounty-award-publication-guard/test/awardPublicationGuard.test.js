import assert from "node:assert/strict"
import packets from "../examples/award-publication-packets.json" with { type: "json" }
import { evaluateAwardPublication, evaluateAwardPublicationBatch, summarize } from "../src/index.js"

const now = "2026-06-12T00:00:00Z"

const [ready, embargoHold, blocked] = evaluateAwardPublicationBatch(packets, { now })

assert.equal(ready.decision, "RELEASE_PUBLICATION")
assert.equal(ready.summary.blocks, 0)
assert.equal(ready.summary.reviews, 0)

assert.equal(embargoHold.decision, "HOLD_FOR_REVIEW")
assert.ok(embargoHold.findings.some((finding) => finding.code === "embargo_active"))

assert.equal(blocked.decision, "BLOCK_PUBLICATION")
assert.ok(blocked.findings.some((finding) => finding.code === "payout_not_authorized"))
assert.ok(blocked.findings.some((finding) => finding.code === "ip_transfer_incomplete"))
assert.ok(blocked.findings.some((finding) => finding.code === "award_splits_invalid"))
assert.ok(blocked.findings.some((finding) => finding.code === "recipient_terms_missing"))

const anonymousPacket = structuredClone(packets[0])
anonymousPacket.publication.namedWinners = false
anonymousPacket.award.splits[0].namedConsent = false
anonymousPacket.award.splits[1].namedConsent = false
const anonymousResult = evaluateAwardPublication(anonymousPacket, { now })
assert.equal(anonymousResult.decision, "RELEASE_PUBLICATION")
assert.ok(anonymousResult.findings.some((finding) => finding.code === "anonymous_publication_ok"))

const openLicensePacket = structuredClone(packets[0])
openLicensePacket.ip = { policy: "open_license" }
const openLicenseResult = evaluateAwardPublication(openLicensePacket, { now })
assert.equal(openLicenseResult.decision, "HOLD_FOR_REVIEW")
assert.ok(openLicenseResult.findings.some((finding) => finding.code === "open_license_missing"))

const batchSummary = summarize([ready, embargoHold, blocked])
assert.equal(batchSummary.blocks, blocked.summary.blocks)
assert.equal(batchSummary.reviews, embargoHold.summary.reviews + blocked.summary.reviews)

console.log("award publication guard tests passed")
