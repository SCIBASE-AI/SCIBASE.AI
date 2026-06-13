export function evaluateInstrumentGraphPacket(packet, options = {}) {
  const now = normalizeDate(options.now ?? new Date())
  const findings = []

  checkInstrumentIdentity(packet, findings)
  checkCertificatePresence(packet, findings)
  checkCertificateValidity(packet, findings, now)
  checkExperimentCoverage(packet, findings)
  checkUnitCompatibility(packet, findings)
  checkRecommendationSafety(packet, findings)

  const blocks = findings.filter((finding) => finding.severity === "block")
  const reviews = findings.filter((finding) => finding.severity === "review")

  const decision = blocks.length
    ? "BLOCK_RECOMMENDATION"
    : reviews.length
      ? "HOLD_FOR_CURATOR"
      : "PUBLISH_GRAPH_EDGE"

  return {
    graphNodeId: packet.instrument?.nodeId ?? "unknown",
    decision,
    checkedAt: now.toISOString(),
    summary: summarize(findings),
    findings,
    audit: {
      instrumentType: packet.instrument?.type ?? "unknown",
      certificateId: packet.calibration?.certificateId ?? null,
      experimentCount: packet.experimentEdges?.length ?? 0,
      recommendationTargets: packet.recommendationTargets?.length ?? 0
    }
  }
}

export function evaluateInstrumentGraphBatch(packets, options = {}) {
  return packets.map((packet) => evaluateInstrumentGraphPacket(packet, options))
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

function checkInstrumentIdentity(packet, findings) {
  const instrument = packet.instrument ?? {}
  const missing = ["nodeId", "model", "serialNumber", "type"].filter((field) => !instrument[field])

  if (missing.length) {
    findings.push(issue("instrument_identity_incomplete", "block", `Instrument identity missing: ${missing.join(", ")}.`))
    return
  }

  findings.push(issue("instrument_identity_ready", "pass", "Instrument node has stable model, serial, type, and graph ID metadata."))
}

function checkCertificatePresence(packet, findings) {
  const calibration = packet.calibration ?? {}
  const missing = ["certificateId", "issuer", "artifactHash", "validFrom", "validUntil"].filter((field) => !calibration[field])

  if (missing.length) {
    findings.push(issue("calibration_certificate_missing", "block", `Calibration certificate evidence missing: ${missing.join(", ")}.`))
    return
  }

  findings.push(issue("calibration_certificate_present", "pass", "Calibration certificate metadata and artifact hash are present."))
}

function checkCertificateValidity(packet, findings, now) {
  const calibration = packet.calibration ?? {}
  if (calibration.revoked === true) {
    findings.push(issue("calibration_revoked", "block", "Calibration certificate is revoked."))
    return
  }

  const validFrom = parseOptionalDate(calibration.validFrom)
  const validUntil = parseOptionalDate(calibration.validUntil)
  if (!validFrom || !validUntil) return

  if (validUntil < now) {
    findings.push(issue("calibration_expired", "review", `Calibration certificate expired at ${validUntil.toISOString()}.`))
    return
  }

  findings.push(issue("calibration_current", "pass", "Calibration certificate is current at review time."))
}

function checkExperimentCoverage(packet, findings) {
  const calibration = packet.calibration ?? {}
  const validFrom = parseOptionalDate(calibration.validFrom)
  const validUntil = parseOptionalDate(calibration.validUntil)
  const edges = packet.experimentEdges ?? []

  if (!edges.length) {
    findings.push(issue("experiment_edges_missing", "review", "No experiment edges are attached to the instrument node."))
    return
  }

  const uncovered = edges.filter((edge) => {
    const measuredAt = parseOptionalDate(edge.measuredAt)
    return !measuredAt || !validFrom || !validUntil || measuredAt < validFrom || measuredAt > validUntil
  })

  if (uncovered.length) {
    findings.push(issue("experiment_outside_calibration_window", "block", `Experiment edges outside calibration window: ${uncovered.map((edge) => edge.edgeId).join(", ")}.`))
    return
  }

  findings.push(issue("experiment_edges_covered", "pass", "All experiment edges fall inside the calibration validity window."))
}

function checkUnitCompatibility(packet, findings) {
  const allowedUnits = new Set(packet.instrument?.capabilityUnits ?? [])
  const incompatible = (packet.experimentEdges ?? []).filter((edge) => !allowedUnits.has(edge.measurementUnit))

  if (allowedUnits.size === 0) {
    findings.push(issue("capability_units_missing", "review", "Instrument capability units are missing."))
    return
  }

  if (incompatible.length) {
    findings.push(issue("unit_incompatible", "review", `Measurement units not declared for instrument capability: ${incompatible.map((edge) => `${edge.edgeId}:${edge.measurementUnit}`).join(", ")}.`))
    return
  }

  findings.push(issue("unit_compatibility_ready", "pass", "Experiment measurement units match declared instrument capabilities."))
}

function checkRecommendationSafety(packet, findings) {
  const targets = packet.recommendationTargets ?? []
  if (!targets.length) {
    findings.push(issue("recommendation_targets_missing", "review", "No recommendation targets are attached for graph navigation."))
    return
  }

  const unsafe = targets.filter((target) => target.usesInstrumentReliability === true && target.requiresCurrentCalibration === true && target.publicationMode !== "holdable")
  if (unsafe.length) {
    findings.push(issue("recommendation_without_hold_control", "block", `Recommendation targets need hold controls before publication: ${unsafe.map((target) => target.targetId).join(", ")}.`))
    return
  }

  findings.push(issue("recommendation_controls_ready", "pass", "Recommendation targets can be held when calibration evidence is not publishable."))
}

function issue(code, severity, message) {
  return {
    code,
    severity,
    message,
    remediation: remediationFor(code)
  }
}

function remediationFor(code) {
  const remediations = {
    instrument_identity_incomplete: "Add stable instrument node ID, type, model, and serial metadata before graph publication.",
    calibration_certificate_missing: "Attach calibration certificate ID, issuer, artifact hash, and validity dates.",
    calibration_revoked: "Remove the instrument from public recommendations until a valid replacement certificate is attached.",
    calibration_expired: "Refresh calibration evidence or hold graph publication for affected instrument edges.",
    experiment_edges_missing: "Attach at least one experiment edge or suppress empty instrument pages.",
    experiment_outside_calibration_window: "Split or hold experiment edges measured outside the calibration validity window.",
    capability_units_missing: "Declare instrument capability units before enabling unit-sensitive recommendations.",
    unit_incompatible: "Normalize units or route the graph packet to a curator for capability review.",
    recommendation_targets_missing: "Attach intended recommendation targets or mark the node as navigation-only.",
    recommendation_without_hold_control: "Add hold controls so recommendation edges are suppressed when calibration evidence fails."
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
