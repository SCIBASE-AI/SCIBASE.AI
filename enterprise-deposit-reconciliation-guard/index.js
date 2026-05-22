import { createHash } from "node:crypto"

const DEFAULT_NOW = "2026-05-21T12:00:00.000Z"

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const sameValue = (left, right) => normalize(left) === normalize(right)

const unique = (values) => [...new Set(values.filter(Boolean))]

const digestFor = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const addDays = (dateString, days) => {
  const date = new Date(dateString)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const isAfterDate = (left, right) =>
  Boolean(left && right && new Date(left).getTime() > new Date(right).getTime())

const finding = ({ packageId, targetId, code, severity, message, evidence, action }) => ({
  packageId,
  targetId,
  code,
  severity,
  message,
  evidence,
  action,
})

const receiptFilesByPath = (receipt) =>
  new Map((receipt?.files ?? []).map((file) => [file.path, file]))

const receiptContributorsByOrcid = (receipt) =>
  new Map(
    (receipt?.metadata?.contributors ?? [])
      .filter((contributor) => contributor.orcid)
      .map((contributor) => [contributor.orcid, contributor]),
  )

const requiredMetadataSatisfied = (receipt, requirement) => {
  if (requirement === "datacite") return receipt?.metadata?.datacite === true
  if (requirement === "schemaOrg") return receipt?.metadata?.schemaOrg === true
  if (requirement === "jats") return receipt?.metadata?.jats === true
  if (requirement === "license") return Boolean(receipt?.metadata?.license)
  if (requirement === "orcid") return receiptContributorsByOrcid(receipt).size > 0
  if (requirement === "version") return Boolean(receipt?.metadata?.version)
  return Boolean(receipt?.metadata?.[requirement])
}

const evaluateTarget = (projectPackage, target, now) => {
  const receipt = (projectPackage.receipts ?? []).find(
    (candidate) => candidate.targetId === target.id,
  )
  const findings = []
  const packageId = projectPackage.id
  const targetId = target.id

  if (!receipt) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "missing_repository_receipt",
        severity: "critical",
        message: `${target.name} has no deposit acknowledgement for this export package.`,
        evidence: { expectedRepository: target.name, exportedAt: projectPackage.exportedAt },
        action: "Hold the enterprise export until the repository returns a deposit receipt.",
      }),
    )
    return { targetId, repository: target.name, status: "hold", findings }
  }

  if (/reject|fail|error/i.test(receipt.status ?? "")) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "repository_rejected_deposit",
        severity: "critical",
        message: `${target.name} rejected or failed the deposit.`,
        evidence: { receiptId: receipt.receiptId, status: receipt.status, reason: receipt.reason },
        action: "Block compliance credit and route the receipt to the repository owner for repair.",
      }),
    )
  }

  if (!/indexed/i.test(receipt.status ?? "")) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "repository_not_indexed",
        severity: "warning",
        message: `${target.name} accepted the package but has not confirmed indexing yet.`,
        evidence: { receiptId: receipt.receiptId, status: receipt.status },
        action: "Keep the export in follow-up until the indexing webhook or poll result arrives.",
      }),
    )
  }

  if (
    target.expectedPersistentId &&
    !sameValue(target.expectedPersistentId, receipt.persistentId)
  ) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "persistent_identifier_mismatch",
        severity: "critical",
        message: `${target.name} returned a DOI/handle/accession that does not match the export request.`,
        evidence: {
          expected: target.expectedPersistentId,
          received: receipt.persistentId,
          receiptId: receipt.receiptId,
        },
        action: "Do not mark the export complete until the repository record points at the intended identifier.",
      }),
    )
  }

  if (receipt.repositoryVersion !== projectPackage.version) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "repository_version_mismatch",
        severity: "critical",
        message: `${target.name} indexed a different project version than the submitted package.`,
        evidence: {
          submittedVersion: projectPackage.version,
          repositoryVersion: receipt.repositoryVersion,
        },
        action: "Reconcile the repository record or redeposit the exact version before reporting compliance.",
      }),
    )
  }

  const filesByPath = receiptFilesByPath(receipt)
  for (const artifact of projectPackage.artifacts ?? []) {
    if (artifact.optional) continue
    const repositoryFile = filesByPath.get(artifact.path)
    if (!repositoryFile) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "required_artifact_missing_from_deposit",
          severity: "critical",
          message: `${target.name} receipt is missing a required artifact.`,
          evidence: { path: artifact.path, expectedSha256: artifact.sha256 },
          action: "Re-run the export package and verify that every required artifact appears in the deposit manifest.",
        }),
      )
      continue
    }

    if (repositoryFile.sha256 !== artifact.sha256) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "artifact_checksum_mismatch",
          severity: "critical",
          message: `${target.name} received a file whose checksum differs from the submitted package.`,
          evidence: {
            path: artifact.path,
            expectedSha256: artifact.sha256,
            receivedSha256: repositoryFile.sha256,
          },
          action: "Hold publication credit until the repository file is replaced or the package version is corrected.",
        }),
      )
    }
  }

  const receiptContributors = receiptContributorsByOrcid(receipt)
  for (const contributor of projectPackage.contributors ?? []) {
    const repositoryContributor = contributor.orcid
      ? receiptContributors.get(contributor.orcid)
      : null
    if (!repositoryContributor) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "contributor_orcid_missing",
          severity: "critical",
          message: `${target.name} did not preserve a required contributor ORCID.`,
          evidence: { contributor: contributor.name, orcid: contributor.orcid },
          action: "Update repository metadata before the institutional profile or ORCID sync is marked complete.",
        }),
      )
      continue
    }

    const missingRoles = (contributor.creditRoles ?? []).filter(
      (role) => !(repositoryContributor.creditRoles ?? []).includes(role),
    )
    if (missingRoles.length > 0) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "credit_role_missing",
          severity: "warning",
          message: `${target.name} preserved the contributor but dropped one or more CRediT roles.`,
          evidence: { contributor: contributor.name, missingRoles },
          action: "Patch the repository metadata so contributor credit remains auditable.",
        }),
      )
    }
  }

  if (projectPackage.license && !sameValue(projectPackage.license, receipt.metadata?.license)) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "license_metadata_mismatch",
        severity: "critical",
        message: `${target.name} metadata does not preserve the submitted license.`,
        evidence: { expected: projectPackage.license, received: receipt.metadata?.license },
        action: "Correct the repository license field before downstream reuse or compliance export.",
      }),
    )
  }

  if (target.expectedAccess && !sameValue(target.expectedAccess, receipt.access)) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "access_policy_mismatch",
        severity: "critical",
        message: `${target.name} access status does not match the institutional export policy.`,
        evidence: { expected: target.expectedAccess, received: receipt.access },
        action: "Do not certify the export until access, embargo, or restricted-data policy is reconciled.",
      }),
    )
  }

  for (const mandate of projectPackage.funderMandates ?? []) {
    if (mandate.repository && mandate.repository !== target.id) continue
    if (isAfterDate(receipt.embargoEnd, mandate.openAccessBy)) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "funder_open_access_deadline_missed",
          severity: "critical",
          message: `${target.name} embargo ends after the funder open-access deadline.`,
          evidence: {
            funder: mandate.funder,
            openAccessBy: mandate.openAccessBy,
            repositoryEmbargoEnd: receipt.embargoEnd,
          },
          action: "Escalate to the institutional compliance owner before reporting funder compliance.",
        }),
      )
    }
  }

  const missingMetadata = (target.requiredMetadata ?? []).filter(
    (requirement) => !requiredMetadataSatisfied(receipt, requirement),
  )
  if (missingMetadata.length > 0) {
    findings.push(
      finding({
        packageId,
        targetId,
        code: "metadata_standard_missing",
        severity: "warning",
        message: `${target.name} is missing required metadata standards for enterprise export reconciliation.`,
        evidence: { missingMetadata },
        action: "Patch the repository metadata before syncing the record to institutional dashboards.",
      }),
    )
  }

  if (target.webhookTopic) {
    if (!receipt.webhook?.deliveredAt) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "webhook_acknowledgement_missing",
          severity: "warning",
          message: `${target.name} has no webhook acknowledgement for the expected export event.`,
          evidence: { expectedTopic: target.webhookTopic },
          action: "Poll the repository or replay the webhook before closing the enterprise export task.",
        }),
      )
    } else if (receipt.webhook.signatureValid !== true) {
      findings.push(
        finding({
          packageId,
          targetId,
          code: "webhook_signature_invalid",
          severity: "critical",
          message: `${target.name} webhook acknowledgement failed signature validation.`,
          evidence: {
            expectedTopic: target.webhookTopic,
            deliveredAt: receipt.webhook.deliveredAt,
            statusCode: receipt.webhook.statusCode,
          },
          action: "Treat the acknowledgement as untrusted and require a signed replay or API poll.",
        }),
      )
    }
  }

  const criticalCount = findings.filter((item) => item.severity === "critical").length
  const status =
    criticalCount > 0 ? "hold" : findings.length > 0 ? "follow_up" : "verified"

  return {
    targetId,
    repository: target.name,
    receiptId: receipt.receiptId,
    persistentId: receipt.persistentId,
    indexedAt: receipt.indexedAt ?? null,
    status,
    findings,
  }
}

export const evaluateDepositReconciliation = (
  exportPackages,
  { now = DEFAULT_NOW } = {},
) => {
  const packageResults = exportPackages.map((projectPackage) => {
    const targetResults = (projectPackage.repositoryTargets ?? []).map((target) =>
      evaluateTarget(projectPackage, target, now),
    )
    const findings = targetResults.flatMap((target) => target.findings)
    const criticalCount = findings.filter((item) => item.severity === "critical").length
    const status =
      criticalCount > 0
        ? "hold_repository_reconciliation"
        : findings.length > 0
          ? "needs_repository_follow_up"
          : "repository_verified"

    return {
      packageId: projectPackage.id,
      title: projectPackage.title,
      institution: projectPackage.institution,
      version: projectPackage.version,
      status,
      targets: targetResults,
      criticalFindings: criticalCount,
      warningFindings: findings.filter((item) => item.severity === "warning").length,
    }
  })

  const reviewerActions = packageResults
    .flatMap((result) => result.targets.flatMap((target) => target.findings))
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1
      return `${left.packageId}:${left.targetId}:${left.code}`.localeCompare(
        `${right.packageId}:${right.targetId}:${right.code}`,
      )
    })

  const summary = {
    status: reviewerActions.some((item) => item.severity === "critical")
      ? "hold_repository_reconciliation"
      : reviewerActions.length > 0
        ? "needs_repository_follow_up"
        : "repository_verified",
    generatedAt: new Date(now).toISOString(),
    packagesReviewed: packageResults.length,
    depositTargetsReviewed: packageResults.reduce(
      (sum, result) => sum + result.targets.length,
      0,
    ),
    verifiedTargets: packageResults.reduce(
      (sum, result) => sum + result.targets.filter((target) => target.status === "verified").length,
      0,
    ),
    followUpTargets: packageResults.reduce(
      (sum, result) =>
        sum + result.targets.filter((target) => target.status === "follow_up").length,
      0,
    ),
    heldTargets: packageResults.reduce(
      (sum, result) => sum + result.targets.filter((target) => target.status === "hold").length,
      0,
    ),
    criticalFindings: reviewerActions.filter((item) => item.severity === "critical").length,
    warningFindings: reviewerActions.filter((item) => item.severity === "warning").length,
  }

  return {
    summary,
    packages: packageResults,
    reviewerActions,
    nextPollDate: addDays(now, summary.heldTargets > 0 ? 1 : 3),
    auditDigest: digestFor({ summary, packageResults, reviewerActions }),
  }
}

export const buildMarkdownPacket = (evaluation) => {
  const lines = [
    "# Enterprise Repository Deposit Reconciliation Packet",
    "",
    `Generated: ${evaluation.summary.generatedAt}`,
    `Overall status: ${evaluation.summary.status}`,
    `Audit digest: ${evaluation.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Packages reviewed: ${evaluation.summary.packagesReviewed}`,
    `- Deposit targets reviewed: ${evaluation.summary.depositTargetsReviewed}`,
    `- Verified targets: ${evaluation.summary.verifiedTargets}`,
    `- Follow-up targets: ${evaluation.summary.followUpTargets}`,
    `- Held targets: ${evaluation.summary.heldTargets}`,
    `- Critical findings: ${evaluation.summary.criticalFindings}`,
    `- Warning findings: ${evaluation.summary.warningFindings}`,
    `- Next poll date: ${evaluation.nextPollDate}`,
    "",
    "## Package Decisions",
    "",
    "| Package | Institution | Version | Status | Critical | Warnings |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...evaluation.packages.map(
      (item) =>
        `| ${item.title} | ${item.institution} | ${item.version} | ${item.status} | ${item.criticalFindings} | ${item.warningFindings} |`,
    ),
    "",
    "## Reviewer Actions",
    "",
    "| Severity | Package | Repository | Code | Action |",
    "| --- | --- | --- | --- | --- |",
    ...evaluation.reviewerActions.map(
      (item) =>
        `| ${item.severity} | ${item.packageId} | ${item.targetId} | ${item.code} | ${item.action} |`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

export const buildSvgSummary = (evaluation) => {
  const { summary } = evaluation
  const statusColor =
    summary.status === "repository_verified"
      ? "#207a4c"
      : summary.status === "needs_repository_follow_up"
        ? "#9a6400"
        : "#9f2f2f"
  const rows = [
    ["Targets", summary.depositTargetsReviewed],
    ["Verified", summary.verifiedTargets],
    ["Follow up", summary.followUpTargets],
    ["Held", summary.heldTargets],
    ["Critical", summary.criticalFindings],
    ["Warnings", summary.warningFindings],
  ]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520" role="img" aria-labelledby="title desc">
  <title id="title">Enterprise repository deposit reconciliation summary</title>
  <desc id="desc">Summary of repository deposit reconciliation outcomes for enterprise exports.</desc>
  <rect width="920" height="520" fill="#f7f4ee"/>
  <rect x="40" y="40" width="840" height="440" rx="8" fill="#ffffff" stroke="#24292f" stroke-width="2"/>
  <text x="80" y="105" fill="#24292f" font-size="31" font-family="Arial, sans-serif" font-weight="700">Repository deposit reconciliation</text>
  <text x="80" y="145" fill="${statusColor}" font-size="22" font-family="Arial, sans-serif" font-weight="700">${xmlEscape(summary.status)}</text>
  ${rows
    .map((row, index) => {
      const x = 80 + (index % 3) * 265
      const y = 215 + Math.floor(index / 3) * 130
      return `<rect x="${x}" y="${y - 46}" width="210" height="92" rx="6" fill="#f8fafc" stroke="#d0d7de"/>
  <text x="${x + 20}" y="${y - 10}" fill="#57606a" font-size="17" font-family="Arial, sans-serif">${xmlEscape(row[0])}</text>
  <text x="${x + 20}" y="${y + 28}" fill="#24292f" font-size="35" font-family="Arial, sans-serif" font-weight="700">${xmlEscape(row[1])}</text>`
    })
    .join("\n  ")}
  <text x="80" y="438" fill="#57606a" font-size="15" font-family="Arial, sans-serif">Audit digest: ${xmlEscape(evaluation.auditDigest.slice(0, 24))}</text>
</svg>
`
}
