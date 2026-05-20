const assert = require("node:assert/strict")
const {
  REDACTION_NOTICE,
  buildDisclosurePacket,
  digest,
  validateChallengeDisclosure,
} = require("./index")

function sampleChallenge(overrides = {}) {
  return {
    id: "quantum-noise-2026",
    visibility: "private",
    ndaRequired: true,
    ipPolicy: "transfer_on_payout",
    evaluationMode: "reviewer_only",
    sensitiveDomains: ["quantum", "materials"],
    ...overrides,
  }
}

function sampleSubmission() {
  return {
    id: "submission-42",
    team: {
      id: "solver-team",
      displayMode: "anonymous_until_shortlist",
    },
    artifacts: [
      {
        id: "summary",
        title: "Executive Summary",
        kind: "document",
        confidential: true,
        ipProtected: false,
        content: "A safe summary of the experiment design.",
      },
      {
        id: "solver-formula",
        title: "Noise Reduction Formula",
        kind: "notebook",
        confidential: true,
        ipProtected: true,
        content: "proprietary coefficients and solver-owned algorithm",
        safeSummary: "Formula committed by hash; raw notebook withheld until settlement.",
      },
    ],
  }
}

function testSponsorPreviewRedactsUnpaidIp() {
  const packet = buildDisclosurePacket({
    challenge: sampleChallenge(),
    submission: sampleSubmission(),
    actor: { role: "sponsor", id: "sponsor", ndaSigned: true },
    settlement: { status: "under_review" },
  })

  const formula = packet.artifacts.find((artifact) => artifact.id === "solver-formula")
  assert.equal(packet.disclosureStatus, "gated")
  assert.equal(formula.redacted, true)
  assert.equal(formula.content.includes("proprietary coefficients"), false)
  assert.equal(packet.withheldArtifacts.length, 1)
  assert.match(packet.requiredActions.join("\n"), /Protected solver IP/)
}

function testReviewerWithClearanceCanInspectIpWithoutTransfer() {
  const packet = buildDisclosurePacket({
    challenge: sampleChallenge(),
    submission: sampleSubmission(),
    actor: { role: "reviewer", id: "reviewer", ndaSigned: true, clearance: "full" },
    settlement: { status: "under_review" },
  })

  const formula = packet.artifacts.find((artifact) => artifact.id === "solver-formula")
  assert.equal(packet.disclosureStatus, "ready")
  assert.equal(formula.redacted, false)
  assert.equal(packet.ipTransferReady, false)
}

function testSponsorSettlementUnlocksIpTransfer() {
  const packet = buildDisclosurePacket({
    challenge: sampleChallenge(),
    submission: sampleSubmission(),
    actor: { role: "sponsor", id: "sponsor", ndaSigned: true },
    settlement: { status: "funded_settled" },
  })

  const formula = packet.artifacts.find((artifact) => artifact.id === "solver-formula")
  assert.equal(packet.disclosureStatus, "ready")
  assert.equal(formula.redacted, false)
  assert.equal(packet.ipTransferReady, true)
}

function testPrivateChallengeRequiresNda() {
  const readiness = validateChallengeDisclosure(
    sampleChallenge({ visibility: "private", ndaRequired: false }),
  )

  assert.equal(readiness.ready, false)
  assert.match(readiness.requiredActions.join("\n"), /Private challenges must require an NDA/)
}

function testAuditDigestIsDeterministic() {
  const input = {
    challenge: sampleChallenge(),
    submission: sampleSubmission(),
    actor: { role: "sponsor", id: "sponsor", ndaSigned: true },
    settlement: { status: "under_review" },
  }

  const first = buildDisclosurePacket(input)
  const second = buildDisclosurePacket(input)
  assert.equal(first.auditDigest, second.auditDigest)
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }))
}

function testMissingNdaBlocksConfidentialArtifact() {
  const packet = buildDisclosurePacket({
    challenge: sampleChallenge(),
    submission: sampleSubmission(),
    actor: { role: "sponsor", id: "sponsor", ndaSigned: false },
    settlement: { status: "funded_settled" },
  })

  const summary = packet.artifacts.find((artifact) => artifact.id === "summary")
  assert.equal(summary.redacted, true)
  assert.equal(summary.content, REDACTION_NOTICE)
  assert.match(packet.requiredActions.join("\n"), /Confidential artifact requires NDA/)
}

const tests = [
  testSponsorPreviewRedactsUnpaidIp,
  testReviewerWithClearanceCanInspectIpWithoutTransfer,
  testSponsorSettlementUnlocksIpTransfer,
  testPrivateChallengeRequiresNda,
  testAuditDigestIsDeterministic,
  testMissingNdaBlocksConfidentialArtifact,
]

for (const test of tests) {
  test()
  console.log(`ok - ${test.name}`)
}

console.log(`${tests.length} tests passed`)
