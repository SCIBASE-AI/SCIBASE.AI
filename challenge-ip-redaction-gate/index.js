const crypto = require("node:crypto")

const REDACTION_NOTICE =
  "[REDACTED: solver IP withheld until funded settlement or authorized reviewer access]"

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function validateChallengeDisclosure(challenge) {
  const requiredActions = []

  if (!challenge.id) requiredActions.push("Add a stable challenge id.")
  if (!challenge.ipPolicy) requiredActions.push("Define an IP policy.")
  if (!challenge.evaluationMode) requiredActions.push("Define an evaluation mode.")

  if (challenge.visibility === "private" && !challenge.ndaRequired) {
    requiredActions.push("Private challenges must require an NDA.")
  }

  if (
    challenge.sensitiveDomains?.length > 0 &&
    challenge.evaluationMode === "open_preview" &&
    !challenge.ndaRequired
  ) {
    requiredActions.push(
      "Sensitive-domain challenges need NDA-gated previews or reviewer-only packets.",
    )
  }

  return {
    ready: requiredActions.length === 0,
    requiredActions,
  }
}

function actorCanViewProtectedIp(actor, challenge, settlement) {
  if (actor.role === "sponsor") return settlement?.status === "funded_settled"
  if (actor.role === "reviewer") return Boolean(actor.ndaSigned && actor.clearance === "full")
  if (actor.role === "arbitrator") return Boolean(actor.ndaSigned)
  return false
}

function actorCanViewConfidential(actor, challenge) {
  if (actor.role === "sponsor") return !challenge.ndaRequired || actor.ndaSigned
  if (actor.role === "reviewer" || actor.role === "arbitrator") return actor.ndaSigned
  return false
}

function classifyArtifact(artifact, challenge, actor, settlement) {
  if (artifact.ipProtected && !actorCanViewProtectedIp(actor, challenge, settlement)) {
    return {
      classification: "protected_ip_redacted",
      discloseRaw: false,
      reason: "Protected solver IP is withheld until funded settlement or authorized reviewer access.",
    }
  }

  if (artifact.confidential && !actorCanViewConfidential(actor, challenge)) {
    return {
      classification: "confidential_blocked",
      discloseRaw: false,
      reason: "Confidential artifact requires NDA-gated access.",
    }
  }

  if (artifact.containsHumanSubjectsData && actor.role === "sponsor" && !settlement?.ethicsCleared) {
    return {
      classification: "ethics_redacted",
      discloseRaw: false,
      reason: "Human-subjects data requires ethics clearance before sponsor disclosure.",
    }
  }

  return {
    classification: "disclosed",
    discloseRaw: true,
    reason: "Actor is authorized for this artifact.",
  }
}

function redactArtifact(artifact, challenge, actor, settlement) {
  const decision = classifyArtifact(artifact, challenge, actor, settlement)
  const contentHash = digest({
    id: artifact.id,
    title: artifact.title,
    content: artifact.content,
  })

  if (decision.discloseRaw) {
    return {
      id: artifact.id,
      title: artifact.title,
      kind: artifact.kind,
      classification: decision.classification,
      content: artifact.content,
      contentHash,
      redacted: false,
    }
  }

  return {
    id: artifact.id,
    title: artifact.title,
    kind: artifact.kind,
    classification: decision.classification,
    content: artifact.safeSummary || REDACTION_NOTICE,
    contentHash,
    redacted: true,
    redactionReason: decision.reason,
  }
}

function buildDisclosurePacket({ challenge, submission, actor, settlement = {} }) {
  const challengeReadiness = validateChallengeDisclosure(challenge)
  const artifacts = submission.artifacts.map((artifact) =>
    redactArtifact(artifact, challenge, actor, settlement),
  )
  const withheldArtifacts = artifacts.filter((artifact) => artifact.redacted)
  const requiredActions = [...challengeReadiness.requiredActions]

  for (const artifact of withheldArtifacts) {
    requiredActions.push(`${artifact.id}: ${artifact.redactionReason}`)
  }

  const ipTransferReady =
    actor.role === "sponsor" &&
    settlement.status === "funded_settled" &&
    challenge.ipPolicy === "transfer_on_payout" &&
    withheldArtifacts.length === 0

  const packet = {
    challengeId: challenge.id,
    submissionId: submission.id,
    actor: {
      role: actor.role,
      id: actor.id,
    },
    team: {
      id: submission.team.id,
      displayMode: submission.team.displayMode,
    },
    disclosureStatus: requiredActions.length === 0 ? "ready" : "gated",
    ipTransferReady,
    artifacts,
    withheldArtifacts: withheldArtifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      classification: artifact.classification,
      contentHash: artifact.contentHash,
      reason: artifact.redactionReason,
    })),
    requiredActions,
  }

  return {
    ...packet,
    auditDigest: digest(packet),
  }
}

module.exports = {
  REDACTION_NOTICE,
  buildDisclosurePacket,
  classifyArtifact,
  digest,
  stableJson,
  validateChallengeDisclosure,
}
