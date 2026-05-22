const crypto = require("node:crypto")

const DAY_MS = 24 * 60 * 60 * 1000

const DEFAULT_POLICY = Object.freeze({
  maxSnapshotAgeDays: 30,
  maxRestoreDrillAgeDays: 21,
  maxNotebookReplayAgeDays: 14,
  requiredRefs: ["refs/heads/main"],
  requiredComponents: ["manuscript", "data", "code", "metadata"],
  requiredEnvironmentLocks: ["containerDigest", "dependencyLock"],
  policyVersion: "repository-restore-rehearsal-v1",
})

function evaluateRestoreRehearsal(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const now = Date.parse(asOf)
  const repositories = Array.isArray(input.repositories) ? input.repositories : []
  const repositoryDecisions = repositories.map((repository) => evaluateRepository(repository, now, policy))
  const remediationQueue = repositoryDecisions.flatMap((repository) => repository.remediationQueue)
  const summary = summarize(repositoryDecisions, remediationQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    repositories: repositoryDecisions.map((repository) => ({
      repositoryId: repository.repositoryId,
      status: repository.status,
      snapshotId: repository.snapshotId,
      findingCodes: repository.findings.map((finding) => finding.code),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    repositories: repositoryDecisions,
    remediationQueue,
    releaseQueue: repositoryDecisions
      .filter((repository) => repository.status === "restore_ready")
      .map((repository) => ({
        repositoryId: repository.repositoryId,
        snapshotId: repository.snapshotId,
        tag: repository.releaseCandidate.tag,
        action: "allow_release_export",
      })),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateRepository(repository, now, policy) {
  const releaseCandidate = repository.releaseCandidate || {}
  const snapshot = findSnapshot(repository.snapshots, releaseCandidate.snapshotId)
  const findings = []
  const checks = []

  addCheck(checks, findings, {
    code: "candidate_snapshot_declared",
    severity: "critical",
    pass: Boolean(releaseCandidate.snapshotId),
    message: "Release candidate declares the snapshot that should be restored before export.",
    remediation: "Bind the release candidate to an immutable snapshot id before tagging or exporting.",
  })

  addCheck(checks, findings, {
    code: "snapshot_found",
    severity: "critical",
    pass: Boolean(snapshot),
    message: "Declared snapshot exists in the repository restore catalog.",
    remediation: "Create or re-index the immutable snapshot before continuing release review.",
  })

  if (!snapshot) {
    return repositoryDecision(repository, releaseCandidate, null, checks, findings, policy)
  }

  const snapshotAgeDays = daysBetween(now, snapshot.createdAt)
  addCheck(checks, findings, {
    code: "snapshot_recency",
    severity: "warning",
    pass: snapshotAgeDays <= policy.maxSnapshotAgeDays,
    message: `Snapshot age is ${snapshotAgeDays} days.`,
    remediation: "Cut a fresh snapshot or document why an older snapshot is still the release source.",
    evidence: { snapshotAgeDays, maxSnapshotAgeDays: policy.maxSnapshotAgeDays },
  })

  const drill = latestRestoreDrill(repository.restoreDrills, snapshot.id)
  const drillAgeDays = drill ? daysBetween(now, drill.completedAt) : null
  addCheck(checks, findings, {
    code: "restore_drill_recent_passed",
    severity: "critical",
    pass: Boolean(drill && drill.status === "passed" && drillAgeDays <= policy.maxRestoreDrillAgeDays),
    message: drill
      ? `Latest restore drill status is ${drill.status} and age is ${drillAgeDays} days.`
      : "No restore drill exists for the release snapshot.",
    remediation: "Run a restore rehearsal from the immutable snapshot and attach the passed drill report.",
    evidence: drill ? { drillId: drill.id, status: drill.status, drillAgeDays } : { drillId: null },
  })

  const requiredRefs = unique([...(policy.requiredRefs || []), ...(releaseCandidate.requiredRefs || [])])
  const snapshotRefs = new Set(normalizeArray(snapshot.refs))
  const missingRefs = requiredRefs.filter((ref) => !snapshotRefs.has(ref))
  addCheck(checks, findings, {
    code: "ref_coverage",
    severity: "critical",
    pass: missingRefs.length === 0,
    message: missingRefs.length === 0
      ? "Snapshot covers every required protected branch ref."
      : `Snapshot is missing required refs: ${missingRefs.join(", ")}.`,
    remediation: "Rebuild the snapshot with all protected branch refs required for release reconstruction.",
    evidence: { requiredRefs, missingRefs },
  })

  const snapshotTags = new Set(normalizeArray(snapshot.tags))
  addCheck(checks, findings, {
    code: "tag_coverage",
    severity: "warning",
    pass: !releaseCandidate.tag || snapshotTags.has(releaseCandidate.tag),
    message: releaseCandidate.tag
      ? `Release tag ${releaseCandidate.tag} is ${snapshotTags.has(releaseCandidate.tag) ? "present" : "missing"} in the snapshot.`
      : "Release candidate does not declare a semantic tag.",
    remediation: "Attach the release tag to the immutable snapshot before DOI or export publication.",
    evidence: { tag: releaseCandidate.tag || null },
  })

  const componentResult = evaluateComponentIntegrity(repository.expectedComponents, snapshot, policy)
  addCheck(checks, findings, {
    code: "component_manifest_integrity",
    severity: "critical",
    pass: componentResult.failures.length === 0,
    message: componentResult.failures.length === 0
      ? "Required repository components match the snapshot manifest."
      : `Component manifest has ${componentResult.failures.length} restore blockers.`,
    remediation: "Regenerate the manifest from restored files and reconcile missing or mismatched component hashes.",
    evidence: componentResult,
  })

  const mirrorResult = evaluateArtifactMirrors(snapshot)
  addCheck(checks, findings, {
    code: "artifact_mirror_ready",
    severity: "critical",
    pass: mirrorResult.failures.length === 0,
    message: mirrorResult.failures.length === 0
      ? "Large and restricted artifacts have matching restore mirrors."
      : `Artifact mirror readiness has ${mirrorResult.failures.length} blockers.`,
    remediation: "Mirror required LFS or restricted artifacts and verify mirror digests before export.",
    evidence: mirrorResult,
  })

  const lockResult = evaluateEnvironmentLocks(snapshot, policy)
  addCheck(checks, findings, {
    code: "environment_lock_coverage",
    severity: "warning",
    pass: lockResult.missing.length === 0,
    message: lockResult.missing.length === 0
      ? "Environment locks are present for restore replay."
      : `Missing environment locks: ${lockResult.missing.join(", ")}.`,
    remediation: "Attach container image digests and dependency lockfiles used by the restore drill.",
    evidence: lockResult,
  })

  const replayResult = evaluateNotebookReplay(snapshot, now, policy)
  addCheck(checks, findings, {
    code: "notebook_replay_recent",
    severity: replayResult.failed.length > 0 ? "critical" : "warning",
    pass: replayResult.failed.length === 0 && replayResult.stale.length === 0 && replayResult.missing.length === 0,
    message: replayResult.total === 0
      ? "Snapshot contains no notebooks requiring replay evidence."
      : `Notebook replay evidence reviewed for ${replayResult.total} notebook artifacts.`,
    remediation: "Replay notebooks from the restored environment and attach fresh pass evidence.",
    evidence: replayResult,
  })

  addCheck(checks, findings, {
    code: "export_manifest_linked",
    severity: "critical",
    pass: Boolean(snapshot.exportManifest && snapshot.exportManifest.snapshotId === snapshot.id),
    message: snapshot.exportManifest
      ? "Export manifest is linked to the restored snapshot."
      : "Export manifest is missing for the release snapshot.",
    remediation: "Generate an export manifest that names the immutable snapshot and all restored components.",
    evidence: {
      snapshotId: snapshot.id,
      exportSnapshotId: snapshot.exportManifest ? snapshot.exportManifest.snapshotId : null,
      doi: snapshot.exportManifest ? snapshot.exportManifest.doi || null : null,
    },
  })

  return repositoryDecision(repository, releaseCandidate, snapshot, checks, findings, policy)
}

function repositoryDecision(repository, releaseCandidate, snapshot, checks, findings, policy) {
  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const status = criticalFindings.length > 0
    ? "hold_restore_rehearsal"
    : warningFindings.length > 0
      ? "steward_review"
      : "restore_ready"

  return {
    repositoryId: repository.repositoryId,
    title: repository.title,
    status,
    snapshotId: snapshot ? snapshot.id : releaseCandidate.snapshotId || null,
    releaseCandidate,
    summary: {
      checks: checks.length,
      passedChecks: checks.filter((check) => check.pass).length,
      criticalFindings: criticalFindings.length,
      warningFindings: warningFindings.length,
    },
    checks,
    findings,
    remediationQueue: findings.map((finding) => ({
      repositoryId: repository.repositoryId,
      snapshotId: snapshot ? snapshot.id : releaseCandidate.snapshotId || null,
      code: finding.code,
      severity: finding.severity,
      action: remediationAction(finding.code),
      remediation: finding.remediation,
    })),
    restorePacket: {
      policyVersion: policy.policyVersion,
      candidateTag: releaseCandidate.tag || null,
      restoredSnapshot: snapshot ? snapshot.id : null,
      decision: status,
    },
  }
}

function evaluateComponentIntegrity(expectedComponents = [], snapshot, policy) {
  const expected = expectedComponents.length > 0
    ? expectedComponents
    : policy.requiredComponents.map((component) => ({ component, hash: null }))
  const artifacts = new Map((snapshot.artifacts || []).map((artifact) => [artifact.component, artifact]))
  const required = new Set(policy.requiredComponents || [])
  const failures = []
  const covered = []

  for (const component of expected) {
    const artifact = artifacts.get(component.component)
    if (!artifact && required.has(component.component)) {
      failures.push({ component: component.component, reason: "missing_required_component" })
      continue
    }

    if (!artifact) {
      continue
    }

    if (component.hash && artifact.hash !== component.hash) {
      failures.push({
        component: component.component,
        reason: "hash_mismatch",
        expectedHash: component.hash,
        snapshotHash: artifact.hash,
      })
      continue
    }

    covered.push(component.component)
  }

  for (const requiredComponent of required) {
    if (!artifacts.has(requiredComponent)) {
      failures.push({ component: requiredComponent, reason: "required_component_absent_from_snapshot" })
    }
  }

  return {
    covered: unique(covered),
    failures: uniqueFailures(failures),
  }
}

function evaluateArtifactMirrors(snapshot) {
  const failures = []
  const mirrored = []

  for (const artifact of snapshot.artifacts || []) {
    const needsMirror = artifact.large === true || artifact.restricted === true || artifact.storage === "lfs"
    if (!needsMirror) {
      continue
    }

    if (!artifact.mirror || artifact.mirror.status !== "ready") {
      failures.push({ path: artifact.path, component: artifact.component, reason: "mirror_not_ready" })
      continue
    }

    if (artifact.mirror.hash && artifact.mirror.hash !== artifact.hash) {
      failures.push({ path: artifact.path, component: artifact.component, reason: "mirror_hash_mismatch" })
      continue
    }

    mirrored.push({ path: artifact.path, component: artifact.component })
  }

  return { mirrored, failures }
}

function evaluateEnvironmentLocks(snapshot, policy) {
  const locks = snapshot.environmentLocks || {}
  return {
    present: Object.keys(locks).filter((key) => Boolean(locks[key])),
    missing: (policy.requiredEnvironmentLocks || []).filter((key) => !locks[key]),
  }
}

function evaluateNotebookReplay(snapshot, now, policy) {
  const notebooks = (snapshot.artifacts || []).filter((artifact) => artifact.component === "notebooks")
  const failed = []
  const stale = []
  const missing = []

  for (const notebook of notebooks) {
    if (!notebook.replay) {
      missing.push(notebook.path)
      continue
    }

    if (notebook.replay.status !== "passed") {
      failed.push(notebook.path)
      continue
    }

    const ageDays = daysBetween(now, notebook.replay.completedAt)
    if (ageDays > policy.maxNotebookReplayAgeDays) {
      stale.push({ path: notebook.path, ageDays })
    }
  }

  return {
    total: notebooks.length,
    failed,
    stale,
    missing,
  }
}

function addCheck(checks, findings, check) {
  checks.push({
    code: check.code,
    severity: check.severity,
    pass: check.pass,
    message: check.message,
    evidence: check.evidence || {},
  })

  if (!check.pass) {
    findings.push({
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(repositoryDecisions, remediationQueue) {
  return {
    totalRepositories: repositoryDecisions.length,
    readyRepositories: repositoryDecisions.filter((repository) => repository.status === "restore_ready").length,
    stewardReviewRepositories: repositoryDecisions.filter((repository) => repository.status === "steward_review").length,
    heldRepositories: repositoryDecisions.filter((repository) => repository.status === "hold_restore_rehearsal").length,
    totalFindings: remediationQueue.length,
    criticalFindings: remediationQueue.filter((item) => item.severity === "critical").length,
    warningFindings: remediationQueue.filter((item) => item.severity === "warning").length,
  }
}

function findSnapshot(snapshots = [], snapshotId) {
  if (!snapshotId) {
    return null
  }

  return snapshots.find((snapshot) => snapshot.id === snapshotId) || null
}

function latestRestoreDrill(drills = [], snapshotId) {
  const matching = drills.filter((drill) => drill.snapshotId === snapshotId)
  matching.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
  return matching[0] || null
}

function daysBetween(now, dateValue) {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY
  }

  return Math.floor((now - Date.parse(dateValue)) / DAY_MS)
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  return [...new Set(values)]
}

function uniqueFailures(failures) {
  const seen = new Set()
  return failures.filter((failure) => {
    const key = `${failure.component}:${failure.reason}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function remediationAction(code) {
  const actions = {
    candidate_snapshot_declared: "bind_release_candidate_snapshot",
    snapshot_found: "restore_snapshot_catalog",
    snapshot_recency: "refresh_release_snapshot",
    restore_drill_recent_passed: "run_restore_rehearsal",
    ref_coverage: "rebuild_snapshot_refs",
    tag_coverage: "attach_release_tag",
    component_manifest_integrity: "reconcile_component_manifest",
    artifact_mirror_ready: "repair_artifact_mirror",
    environment_lock_coverage: "attach_environment_locks",
    notebook_replay_recent: "rerun_notebook_replay",
    export_manifest_linked: "generate_export_manifest",
  }

  return actions[code] || "steward_review"
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateRestoreRehearsal,
}
