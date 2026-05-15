import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

import { buildReviewerPacket, evaluateConsentAccess } from "../src/consent-access-broker.js"

const workspace = JSON.parse(fs.readFileSync(new URL("../data/sample-workspace.json", import.meta.url), "utf8"))

test("allows verified owner when consent, DUA, grant, and MFA are present", () => {
  const report = evaluateConsentAccess(workspace)
  const decision = report.decisions.find(
    (item) => item.researcherId === "r-ada" && item.objectId === "obj-dataset",
  )

  assert.equal(decision.allowed, true)
  assert.equal(decision.consentId, "consent-ada-rare")
  assert.equal(decision.agreementId, "dua-northbridge-rare")
  assert.deepEqual(decision.reasons, [])
})

test("holds external collaborator with revoked consent, missing DUA, and missing MFA", () => {
  const report = evaluateConsentAccess(workspace)
  const decision = report.decisions.find(
    (item) => item.researcherId === "r-bea" && item.objectId === "obj-dataset",
  )

  assert.equal(decision.allowed, false)
  assert.ok(decision.reasons.includes("missing-or-revoked-consent"))
  assert.ok(decision.reasons.includes("missing-or-expired-dua"))
  assert.ok(decision.reasons.includes("mfa-required"))
})

test("allows anonymous reviewer only for blinded reviewer object", () => {
  const report = evaluateConsentAccess(workspace)
  const reviewerDataset = report.decisions.find(
    (item) => item.researcherId === "r-chan" && item.objectId === "obj-dataset",
  )
  const reviewerManuscript = report.decisions.find(
    (item) => item.researcherId === "r-chan" && item.objectId === "obj-blinded-manuscript",
  )

  assert.equal(reviewerDataset.allowed, false)
  assert.ok(reviewerDataset.reasons.includes("anonymous-reviewer-private-data-block"))
  assert.equal(reviewerManuscript.allowed, true)
})

test("holds stale partner invitation and sends valid institutional invitation", () => {
  const report = evaluateConsentAccess(workspace)

  assert.deepEqual(
    report.invitationActions.find((item) => item.invitationId === "invite-partner-expired"),
    {
      invitationId: "invite-partner-expired",
      projectId: "p-genome",
      email: "new.member@partnerlab.org",
      action: "hold",
      reasons: ["stale-invitation", "no-active-institution-dua"],
    },
  )
  assert.equal(report.invitationActions.find((item) => item.invitationId === "invite-northbridge").action, "send")
})

test("flags grant drift for unknown or removed researcher grants", () => {
  const report = evaluateConsentAccess(workspace)

  assert.deepEqual(report.grantDrift, [
    {
      grantId: "g-4",
      objectId: "obj-dataset",
      researcherId: "r-former",
      action: "review-grant",
      reasons: ["unknown-researcher", "grant-without-project-membership"],
    },
  ])
})

test("builds deterministic reviewer packet with audit digests and reason totals", () => {
  const first = buildReviewerPacket(workspace)
  const second = buildReviewerPacket(workspace)

  assert.deepEqual(first.summary, second.summary)
  assert.deepEqual(first.heldByReason, second.heldByReason)
  assert.equal(first.auditEvents[0].digest, second.auditEvents[0].digest)
  assert.ok(first.heldByReason["missing-or-revoked-consent"] >= 1)
  assert.ok(first.reviewerChecklist.length >= 4)
})
