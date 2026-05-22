import { createHash } from "node:crypto"

const BLOCKING_SEVERITIES = new Set(["critical", "high"])

const digestFor = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const unique = (values) => [...new Set(values.filter(Boolean))]

const finding = ({
  targetType,
  targetId,
  evidenceId = null,
  code,
  severity,
  message,
  action,
  details = {},
}) => ({
  targetType,
  targetId,
  evidenceId,
  code,
  severity,
  message,
  action,
  details,
})

const buildIndexes = ({ manuscript, evidence }) => ({
  sections: new Map(manuscript.sections.map((section) => [section.id, section])),
  evidence: new Map(evidence.map((item) => [item.id, item])),
})

const evidenceIsCurrent = (item) => item.approvedDigest === item.currentDigest

const upstreamIsCurrent = (item) => {
  const approved = item.upstreamDigests ?? []
  const current = item.currentUpstreamDigests ?? []
  if (approved.length !== current.length) return false
  return approved.every((digest, index) => digest === current[index])
}

const evaluateEvidenceAnchor = (target, item, evidenceSection, targetType) => {
  const findings = []

  if (!item.locked) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "evidence_not_locked",
        severity: "high",
        message: "Evidence anchor is not locked for submission release.",
        action: "Lock the evidence anchor or remove it from the publication-ready release.",
        details: { sourcePath: item.sourcePath },
      }),
    )
  }

  if (!item.approvedAt) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "evidence_not_approved",
        severity: "high",
        message: "Evidence anchor has not been approved for the current release.",
        action: "Approve the evidence packet after rerunning the linked analysis.",
      }),
    )
  }

  if (!evidenceIsCurrent(item)) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "evidence_digest_drift",
        severity: "critical",
        message: "Evidence output changed after it was approved.",
        action: "Rerun review on the current output digest before submission export.",
        details: {
          approvedDigest: item.approvedDigest,
          currentDigest: item.currentDigest,
        },
      }),
    )
  }

  if (!upstreamIsCurrent(item)) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "upstream_source_digest_drift",
        severity: "critical",
        message: "A dataset, code, or notebook dependency changed after evidence approval.",
        action: "Refresh the bound notebook output and evidence approval packet.",
        details: {
          approvedUpstreamDigests: item.upstreamDigests ?? [],
          currentUpstreamDigests: item.currentUpstreamDigests ?? [],
        },
      }),
    )
  }

  if (item.staleAfter) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "evidence_marked_stale",
        severity: "critical",
        message: "Evidence anchor is explicitly stale relative to the release freeze.",
        action: "Regenerate the evidence and update the manuscript binding before export.",
        details: { staleAfter: item.staleAfter },
      }),
    )
  }

  if (evidenceSection && item.sectionVersionHash !== evidenceSection.versionHash) {
    findings.push(
      finding({
        targetType,
        targetId: target.id,
        evidenceId: item.id,
        code: "section_version_mismatch",
        severity: "high",
        message: "Evidence is bound to a different section version than the release candidate.",
        action: "Rebind the evidence to the current section hash or restore the approved section.",
        details: {
          evidenceSectionVersionHash: item.sectionVersionHash,
          currentSectionVersionHash: evidenceSection.versionHash,
        },
      }),
    )
  }

  return findings
}

const evaluateClaim = (claim, indexes) => {
  const section = indexes.sections.get(claim.sectionId)
  const anchors = (claim.evidenceAnchorIds ?? []).map((id) => indexes.evidence.get(id))
  const presentAnchors = anchors.filter(Boolean)
  const findings = []

  if (!section) {
    findings.push(
      finding({
        targetType: "claim",
        targetId: claim.id,
        code: "missing_section",
        severity: "critical",
        message: "Claim references a section that does not exist.",
        action: "Move the claim to a valid locked section before release.",
      }),
    )
  } else if (!section.locked) {
    findings.push(
      finding({
        targetType: "claim",
        targetId: claim.id,
        code: "section_not_locked",
        severity: "high",
        message: "Publication-ready claim lives in an unlocked section.",
        action: "Lock the section or remove the claim from the submission freeze.",
        details: { sectionId: section.id, sectionTitle: section.title },
      }),
    )
  }

  for (const id of claim.evidenceAnchorIds ?? []) {
    if (!indexes.evidence.has(id)) {
      findings.push(
        finding({
          targetType: "claim",
          targetId: claim.id,
          evidenceId: id,
          code: "missing_evidence_anchor",
          severity: "critical",
          message: "Claim references an evidence anchor that does not exist.",
          action: "Attach a valid evidence anchor or remove the unsupported claim.",
        }),
      )
    }
  }

  for (const requiredType of claim.requiredEvidenceTypes ?? []) {
    if (!presentAnchors.some((anchor) => anchor.type === requiredType)) {
      findings.push(
        finding({
          targetType: "claim",
          targetId: claim.id,
          code: "required_evidence_type_missing",
          severity: "critical",
          message: `Claim is missing required ${requiredType} evidence.`,
          action: "Bind the claim to the required evidence type before submission export.",
          details: { requiredType },
        }),
      )
    }
  }

  if ((claim.citationKeys ?? []).length === 0 && claim.type !== "methods_note") {
    findings.push(
      finding({
        targetType: "claim",
        targetId: claim.id,
        code: "citation_binding_missing",
        severity: "high",
        message: "Claim has no citation key bound to the supporting evidence.",
        action: "Bind a DOI or citation key to the evidence packet for reviewer traceability.",
      }),
    )
  }

  for (const item of presentAnchors) {
    findings.push(...evaluateEvidenceAnchor(claim, item, indexes.sections.get(item.sectionId), "claim"))

    if (item.citationKey && !claim.citationKeys?.includes(item.citationKey)) {
      findings.push(
        finding({
          targetType: "claim",
          targetId: claim.id,
          evidenceId: item.id,
          code: "citation_key_not_referenced",
          severity: "medium",
          message: "Evidence citation key is not referenced by the manuscript claim.",
          action: "Add the citation key to the claim or remove the mismatched evidence anchor.",
          details: { citationKey: item.citationKey },
        }),
      )
    }

    if (item.type !== "dataset" && !item.doi && !item.citationKey) {
      findings.push(
        finding({
          targetType: "claim",
          targetId: claim.id,
          evidenceId: item.id,
          code: "citation_metadata_missing",
          severity: "high",
          message: "Evidence anchor lacks DOI and citation metadata.",
          action: "Add a DOI or stable citation key before the claim is exportable.",
        }),
      )
    }
  }

  return {
    id: claim.id,
    text: claim.text,
    sectionId: claim.sectionId,
    anchorIds: claim.evidenceAnchorIds ?? [],
    status: findings.some((item) => BLOCKING_SEVERITIES.has(item.severity)) ? "hold" : "clear",
    findings,
  }
}

const evaluateAsset = (asset, indexes) => {
  const section = indexes.sections.get(asset.sectionId)
  const anchors = (asset.sourceAnchorIds ?? []).map((id) => indexes.evidence.get(id))
  const findings = []

  if (!section?.locked) {
    findings.push(
      finding({
        targetType: asset.kind,
        targetId: asset.id,
        code: "asset_section_not_locked",
        severity: "high",
        message: "Release asset is attached to an unlocked or missing section.",
        action: "Lock the section or exclude the asset from the publication packet.",
      }),
    )
  }

  if ((asset.sourceAnchorIds ?? []).length === 0) {
    findings.push(
      finding({
        targetType: asset.kind,
        targetId: asset.id,
        code: "asset_source_binding_missing",
        severity: "critical",
        message: "Release asset has no bound source evidence.",
        action: "Bind the asset to a current notebook, dataset, method, or equation source.",
      }),
    )
  }

  for (const id of asset.sourceAnchorIds ?? []) {
    if (!indexes.evidence.has(id)) {
      findings.push(
        finding({
          targetType: asset.kind,
          targetId: asset.id,
          evidenceId: id,
          code: "asset_source_anchor_missing",
          severity: "critical",
          message: "Release asset references a missing source anchor.",
          action: "Attach an existing evidence anchor before export.",
        }),
      )
    }
  }

  for (const item of anchors.filter(Boolean)) {
    findings.push(...evaluateEvidenceAnchor(asset, item, indexes.sections.get(item.sectionId), asset.kind))
  }

  return {
    id: asset.id,
    kind: asset.kind,
    label: asset.label,
    sectionId: asset.sectionId,
    sourceAnchorIds: asset.sourceAnchorIds ?? [],
    status: findings.some((item) => BLOCKING_SEVERITIES.has(item.severity)) ? "hold" : "clear",
    findings,
  }
}

const buildReviewerActions = (claimResults, assetResults) => {
  const findings = [...claimResults, ...assetResults].flatMap((result) => result.findings)
  const grouped = new Map()

  for (const item of findings.filter((entry) => BLOCKING_SEVERITIES.has(entry.severity))) {
    const key = `${item.code}:${item.evidenceId ?? item.targetId}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        code: item.code,
        targetIds: [],
        evidenceId: item.evidenceId,
        severity: item.severity,
        action: item.action,
      })
    }
    grouped.get(key).targetIds.push(item.targetId)
  }

  return [...grouped.values()].map((item) => ({
    ...item,
    targetIds: unique(item.targetIds).sort(),
  }))
}

export const evaluateEvidenceBinding = (input) => {
  const indexes = buildIndexes(input)
  const claimResults = input.manuscript.claims.map((claim) => evaluateClaim(claim, indexes))
  const assetResults = input.manuscript.assets.map((asset) => evaluateAsset(asset, indexes))
  const allFindings = [...claimResults, ...assetResults].flatMap((result) => result.findings)
  const blockingFindings = allFindings.filter((item) => BLOCKING_SEVERITIES.has(item.severity))
  const reviewerActions = buildReviewerActions(claimResults, assetResults)

  const evidenceCoverage = input.evidence.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    sourcePath: item.sourcePath,
    locked: item.locked === true,
    approved: Boolean(item.approvedAt),
    digestCurrent: evidenceIsCurrent(item),
    upstreamCurrent: upstreamIsCurrent(item),
    doi: item.doi,
    citationKey: item.citationKey,
  }))

  const summary = {
    status: blockingFindings.length > 0 ? "hold" : "clear",
    manuscriptId: input.manuscript.id,
    releaseId: input.manuscript.releaseId,
    claimsReviewed: claimResults.length,
    claimsHeld: claimResults.filter((result) => result.status === "hold").length,
    assetsReviewed: assetResults.length,
    assetsHeld: assetResults.filter((result) => result.status === "hold").length,
    evidenceAnchorsReviewed: input.evidence.length,
    currentEvidenceAnchors: evidenceCoverage.filter((item) => item.digestCurrent && item.upstreamCurrent).length,
    criticalFindings: allFindings.filter((item) => item.severity === "critical").length,
    highFindings: allFindings.filter((item) => item.severity === "high").length,
    mediumFindings: allFindings.filter((item) => item.severity === "medium").length,
    reviewerActions: reviewerActions.length,
  }

  const auditDigest = digestFor({
    summary,
    claimResults,
    assetResults,
    evidenceCoverage,
  }).slice(0, 24)

  return {
    summary,
    claimResults,
    assetResults,
    evidenceCoverage,
    reviewerActions,
    auditDigest,
  }
}

export const buildMarkdownPacket = (evaluation) => {
  const lines = [
    "# Manuscript Evidence Binding Review Packet",
    "",
    `Status: ${evaluation.summary.status}`,
    `Audit digest: ${evaluation.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Claims reviewed: ${evaluation.summary.claimsReviewed}`,
    `- Claims held: ${evaluation.summary.claimsHeld}`,
    `- Assets reviewed: ${evaluation.summary.assetsReviewed}`,
    `- Assets held: ${evaluation.summary.assetsHeld}`,
    `- Evidence anchors reviewed: ${evaluation.summary.evidenceAnchorsReviewed}`,
    `- Current evidence anchors: ${evaluation.summary.currentEvidenceAnchors}`,
    `- Critical findings: ${evaluation.summary.criticalFindings}`,
    `- High findings: ${evaluation.summary.highFindings}`,
    "",
    "## Reviewer Actions",
    "",
  ]

  if (evaluation.reviewerActions.length === 0) {
    lines.push("- No blocking actions.")
  } else {
    for (const action of evaluation.reviewerActions) {
      lines.push(
        `- ${action.severity.toUpperCase()} ${action.code}: ${action.action} Targets: ${action.targetIds.join(", ")}`,
      )
    }
  }

  lines.push("", "## Held Claims And Assets", "")
  for (const result of [...evaluation.claimResults, ...evaluation.assetResults].filter(
    (item) => item.status === "hold",
  )) {
    lines.push(`### ${result.id}`, "")
    for (const item of result.findings.filter((entry) => BLOCKING_SEVERITIES.has(entry.severity))) {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`)
      lines.push(`  Action: ${item.action}`)
    }
    lines.push("")
  }

  return `${lines.join("\n").trimEnd()}\n`
}

export const buildSvgSummary = (evaluation) => {
  const rows = [
    ["Claims held", evaluation.summary.claimsHeld, evaluation.summary.claimsReviewed],
    ["Assets held", evaluation.summary.assetsHeld, evaluation.summary.assetsReviewed],
    [
      "Current evidence",
      evaluation.summary.currentEvidenceAnchors,
      evaluation.summary.evidenceAnchorsReviewed,
    ],
    ["Reviewer actions", evaluation.summary.reviewerActions, evaluation.summary.reviewerActions],
  ]

  const rowSvg = rows
    .map(([label, value, total], index) => {
      const y = 190 + index * 78
      const denominator = total === 0 ? 1 : total
      const width = Math.max(12, Math.round((Number(value) / denominator) * 440))
      const fill = label === "Current evidence" ? "#2f855a" : "#b83232"
      return [
        `  <text x="72" y="${y}" class="label">${xmlEscape(label)}</text>`,
        `  <rect x="320" y="${y - 24}" width="440" height="28" rx="6" class="bar-bg"/>`,
        `  <rect x="320" y="${y - 24}" width="${width}" height="28" rx="6" fill="${fill}"/>`,
        `  <text x="790" y="${y}" class="metric">${xmlEscape(value)} / ${xmlEscape(total)}</text>`,
      ].join("\n")
    })
    .join("\n")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560">
  <style>
    .bg { fill: #f7fafc; }
    .panel { fill: #ffffff; stroke: #cbd5e0; stroke-width: 2; }
    .title { font: 700 34px Arial, sans-serif; fill: #1a202c; }
    .subtitle { font: 18px Arial, sans-serif; fill: #4a5568; }
    .label { font: 700 22px Arial, sans-serif; fill: #2d3748; }
    .metric { font: 700 22px Arial, sans-serif; fill: #2d3748; }
    .bar-bg { fill: #edf2f7; }
    .status { font: 700 42px Arial, sans-serif; fill: #b83232; }
  </style>
  <rect class="bg" width="960" height="560"/>
  <rect class="panel" x="36" y="34" width="888" height="492" rx="8"/>
  <text x="72" y="96" class="title">Manuscript Evidence Binding Guard</text>
  <text x="72" y="132" class="subtitle">Release ${xmlEscape(evaluation.summary.releaseId)} | digest ${xmlEscape(evaluation.auditDigest)}</text>
  <text x="72" y="500" class="status">STATUS: ${xmlEscape(evaluation.summary.status.toUpperCase())}</text>
${rowSvg}
</svg>
`
}
