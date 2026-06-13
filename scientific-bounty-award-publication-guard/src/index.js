const HARD_BLOCKS = new Set([
  "missing_award_decision",
  "payout_not_authorized",
  "ip_transfer_incomplete",
  "private_content_unredacted",
  "award_splits_invalid",
  "recipient_terms_missing"
])

export function evaluateAwardPublication(packet, options = {}) {
  const now = normalizeDate(options.now ?? new Date())
  const findings = []

  checkAwardDecision(packet, findings)
  checkPayout(packet, findings)
  checkAppealWindow(packet, findings, now)
  checkIpAndLicense(packet, findings)
  checkEmbargo(packet, findings, now)
  checkPrivacy(packet, findings)
  checkTeamConsent(packet, findings)
  checkAwardSplits(packet, findings)
  checkReproducibility(packet, findings)

  const hardBlocks = findings.filter((finding) => finding.severity === "block")
  const reviewItems = findings.filter((finding) => finding.severity === "review")
  const decision = hardBlocks.length
    ? "BLOCK_PUBLICATION"
    : reviewItems.length
      ? "HOLD_FOR_REVIEW"
      : "RELEASE_PUBLICATION"

  return {
    challengeId: packet.challengeId ?? "unknown",
    awardId: packet.award?.id ?? "unknown",
    decision,
    checkedAt: now.toISOString(),
    summary: summarize(findings),
    findings,
    audit: {
      publicMode: packet.publication?.mode ?? "unknown",
      payoutState: packet.payout?.state ?? "unknown",
      ipPolicy: packet.ip?.policy ?? "unknown",
      embargoUntil: packet.publication?.embargoUntil ?? null,
      recipientCount: packet.award?.splits?.length ?? 0
    }
  }
}

export function evaluateAwardPublicationBatch(packets, options = {}) {
  return packets.map((packet) => evaluateAwardPublication(packet, options))
}

export function summarize(resultsOrFindings) {
  const findings = Array.isArray(resultsOrFindings)
    ? resultsOrFindings.flatMap((item) => item.findings ?? item)
    : []

  return {
    blocks: findings.filter((finding) => finding.severity === "block").length,
    reviews: findings.filter((finding) => finding.severity === "review").length,
    passes: findings.filter((finding) => finding.severity === "pass").length
  }
}

function checkAwardDecision(packet, findings) {
  if (!packet.award?.id || packet.award?.state !== "awarded") {
    findings.push(issue("missing_award_decision", "block", "Award decision is missing or not finalized."))
    return
  }
  if (!packet.award?.sponsorApproved) {
    findings.push(issue("sponsor_approval_missing", "review", "Sponsor has not approved the award publication."))
    return
  }
  findings.push(issue("award_decision_ready", "pass", "Award decision and sponsor approval are present."))
}

function checkPayout(packet, findings) {
  const allowed = new Set(["authorized", "released", "paid"])
  if (!allowed.has(packet.payout?.state)) {
    findings.push(issue("payout_not_authorized", "block", "Public winner publication requires an authorized, released, or paid payout state."))
    return
  }
  findings.push(issue("payout_ready", "pass", "Payout state allows public award publication."))
}

function checkAppealWindow(packet, findings, now) {
  const appeal = packet.appeal ?? {}
  if (appeal.waived === true) {
    findings.push(issue("appeal_waived", "pass", "Appeal window was explicitly waived."))
    return
  }
  const closesAt = parseOptionalDate(appeal.closesAt)
  if (!closesAt) {
    findings.push(issue("appeal_window_missing", "review", "Appeal close timestamp is missing."))
    return
  }
  if (closesAt > now) {
    findings.push(issue("appeal_window_open", "review", `Appeal window is still open until ${closesAt.toISOString()}.`))
    return
  }
  findings.push(issue("appeal_window_closed", "pass", "Appeal window is closed."))
}

function checkIpAndLicense(packet, findings) {
  const ip = packet.ip ?? {}
  if (ip.policy === "transfer_on_payout") {
    if (ip.transferSigned !== true || !["released", "paid"].includes(packet.payout?.state)) {
      findings.push(issue("ip_transfer_incomplete", "block", "IP transfer publication requires signed handoff and released or paid payout."))
      return
    }
  }

  if (ip.policy === "open_license" && !ip.licenseId) {
    findings.push(issue("open_license_missing", "review", "Open publication requires a license identifier."))
    return
  }

  findings.push(issue("ip_terms_ready", "pass", "IP or license terms allow publication."))
}

function checkEmbargo(packet, findings, now) {
  const embargoUntil = parseOptionalDate(packet.publication?.embargoUntil)
  if (embargoUntil && embargoUntil > now) {
    findings.push(issue("embargo_active", "review", `Publication embargo remains active until ${embargoUntil.toISOString()}.`))
    return
  }
  findings.push(issue("embargo_clear", "pass", "No active embargo blocks publication."))
}

function checkPrivacy(packet, findings) {
  const publication = packet.publication ?? {}
  if (publication.mode === "private_challenge_public_award" && publication.redactionApproved !== true) {
    findings.push(issue("private_content_unredacted", "block", "Private or NDA challenge content needs approved public redaction before award publication."))
    return
  }
  findings.push(issue("privacy_release_ready", "pass", "Publication privacy mode is satisfied."))
}

function checkTeamConsent(packet, findings) {
  const publication = packet.publication ?? {}
  if (publication.namedWinners !== true) {
    findings.push(issue("anonymous_publication_ok", "pass", "Winner publication does not expose named solvers."))
    return
  }

  const missing = (packet.award?.splits ?? []).filter((split) => split.namedConsent !== true)
  if (missing.length) {
    findings.push(issue("named_consent_missing", "review", `Named publication consent missing for ${missing.map((item) => item.recipientId).join(", ")}.`))
    return
  }
  findings.push(issue("named_consent_ready", "pass", "All named recipients consented to public announcement."))
}

function checkAwardSplits(packet, findings) {
  const splits = packet.award?.splits ?? []
  const total = splits.reduce((sum, split) => sum + Number(split.percent ?? 0), 0)
  let hasProblem = false
  if (splits.length === 0 || Math.abs(total - 100) > 0.001) {
    findings.push(issue("award_splits_invalid", "block", `Award split percentages must sum to 100; received ${total}.`))
    hasProblem = true
  }

  const missingTerms = splits.filter((split) => split.acceptedPublicationTerms !== true)
  if (missingTerms.length) {
    findings.push(issue("recipient_terms_missing", "block", `Publication terms missing for ${missingTerms.map((item) => item.recipientId).join(", ")}.`))
    hasProblem = true
  }

  if (hasProblem) {
    return
  }
  findings.push(issue("award_splits_ready", "pass", "Award splits and recipient publication terms are complete."))
}

function checkReproducibility(packet, findings) {
  const manifest = packet.reproducibilityManifest ?? {}
  if (!manifest.artifactHash || !manifest.resultDigest) {
    findings.push(issue("reproducibility_manifest_incomplete", "review", "Public claims should include artifact hash and result digest."))
    return
  }
  findings.push(issue("reproducibility_manifest_ready", "pass", "Reproducibility manifest has public claim evidence."))
}

function issue(code, severity, message) {
  return {
    code,
    severity,
    hardBlock: HARD_BLOCKS.has(code),
    message,
    remediation: remediationFor(code)
  }
}

function remediationFor(code) {
  const remediations = {
    missing_award_decision: "Finalize the award record and sponsor approval before publication.",
    payout_not_authorized: "Move payout to authorized, released, or paid before publishing named winners.",
    appeal_window_missing: "Record an appeal close timestamp or explicit waiver.",
    appeal_window_open: "Wait until the appeal window closes or record an approved waiver.",
    ip_transfer_incomplete: "Complete signed IP handoff and release or pay the payout before publication.",
    open_license_missing: "Attach the open license identifier to the award record.",
    embargo_active: "Hold public publication until the embargo expires.",
    private_content_unredacted: "Approve a public redaction packet for private challenge content.",
    named_consent_missing: "Collect named publication consent or publish anonymized winners.",
    award_splits_invalid: "Correct award splits so recipient percentages total exactly 100.",
    recipient_terms_missing: "Collect publication terms from each payout recipient.",
    reproducibility_manifest_incomplete: "Attach artifact hash and result digest before publishing technical claims."
  }
  return remediations[code] ?? "No remediation required."
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }
  return date
}

function parseOptionalDate(value) {
  if (!value) return null
  return normalizeDate(value)
}
