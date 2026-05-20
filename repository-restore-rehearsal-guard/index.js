'use strict';

const crypto = require('crypto');

const DEFAULTS = {
  maxRestoreMinutes: 120,
  minBackupCopies: 2,
  requiredComponents: ['manuscript', 'code', 'data', 'results', 'environment'],
};

const DECISION_RANK = {
  restorable: 0,
  needs_review: 1,
  quarantined: 2,
  unrecoverable: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(start, end) {
  return (end.getTime() - start.getTime()) / 864e5;
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({
    severity,
    code,
    message,
    evidence,
  });
}

function validateIdentity(snapshot, findings) {
  let decision = 'restorable';

  if (!snapshot.repositoryId || !snapshot.versionId || !snapshot.snapshotId) {
    addFinding(findings, 'blocker', 'snapshot_identity_missing', 'Restore rehearsal requires repository, version, and snapshot identifiers.', {
      repositoryId: snapshot.repositoryId || null,
      versionId: snapshot.versionId || null,
      snapshotId: snapshot.snapshotId || null,
    });
    decision = worstDecision(decision, 'unrecoverable');
  }

  if (!snapshot.restoreDrill || snapshot.restoreDrill.status !== 'passed') {
    addFinding(findings, 'blocker', 'restore_drill_failed', 'Repository snapshot cannot be promoted without a passing restore drill.', {
      snapshotId: snapshot.snapshotId || null,
      status: snapshot.restoreDrill ? snapshot.restoreDrill.status : 'missing',
    });
    decision = worstDecision(decision, 'unrecoverable');
  }

  return decision;
}

function evaluateManifest(snapshot, findings) {
  let decision = 'restorable';
  const expected = snapshot.expectedHashes || {};
  const restored = snapshot.restoredHashes || {};
  const required = snapshot.requiredComponents || DEFAULTS.requiredComponents;
  const missing = required.filter((component) => !restored[component]);
  const drifted = Object.keys(expected).filter((component) => restored[component] && expected[component] !== restored[component]);

  if (missing.length > 0) {
    addFinding(findings, 'blocker', 'restore_component_missing', 'Restored snapshot is missing required repository components.', {
      snapshotId: snapshot.snapshotId,
      missing,
    });
    decision = worstDecision(decision, 'quarantined');
  }

  if (drifted.length > 0) {
    addFinding(findings, 'blocker', 'restore_hash_drift', 'Restored component hashes do not match the release manifest.', {
      snapshotId: snapshot.snapshotId,
      drifted,
    });
    decision = worstDecision(decision, 'quarantined');
  }

  if ((snapshot.lfsObjects || []).some((object) => object.available !== true)) {
    const unavailable = (snapshot.lfsObjects || []).filter((object) => object.available !== true).map((object) => object.id);
    addFinding(findings, 'blocker', 'lfs_object_unavailable', 'Large repository artifacts must be available before restore approval.', {
      snapshotId: snapshot.snapshotId,
      unavailable,
    });
    decision = worstDecision(decision, 'quarantined');
  }

  return decision;
}

function evaluateBackup(snapshot, checkedAt, findings) {
  let decision = 'restorable';
  const retentionExpiresAt = asDate(snapshot.backup?.retentionExpiresAt);
  const restoreMinutes = snapshot.restoreDrill?.durationMinutes;

  if ((snapshot.backup?.copies || 0) < DEFAULTS.minBackupCopies) {
    addFinding(findings, 'warning', 'backup_copy_count_low', 'Repository snapshot has fewer backup copies than the restore policy requires.', {
      snapshotId: snapshot.snapshotId,
      copies: snapshot.backup?.copies || 0,
      required: DEFAULTS.minBackupCopies,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (!snapshot.backup?.encryptionKeyEscrowed) {
    addFinding(findings, 'blocker', 'backup_key_escrow_missing', 'Encrypted repository backup is missing recoverable key escrow evidence.', {
      snapshotId: snapshot.snapshotId,
    });
    decision = worstDecision(decision, 'unrecoverable');
  }

  if (!retentionExpiresAt) {
    addFinding(findings, 'warning', 'backup_retention_missing', 'Backup retention expiry should be recorded for release restore review.', {
      snapshotId: snapshot.snapshotId,
    });
    decision = worstDecision(decision, 'needs_review');
  } else if (daysUntil(checkedAt, retentionExpiresAt) < 0) {
    addFinding(findings, 'blocker', 'backup_retention_expired', 'Repository snapshot backup retention has already expired.', {
      snapshotId: snapshot.snapshotId,
      retentionExpiresAt: retentionExpiresAt.toISOString(),
    });
    decision = worstDecision(decision, 'unrecoverable');
  }

  if (typeof restoreMinutes === 'number' && restoreMinutes > DEFAULTS.maxRestoreMinutes) {
    addFinding(findings, 'warning', 'restore_rto_exceeded', 'Restore rehearsal exceeded the recovery time objective.', {
      snapshotId: snapshot.snapshotId,
      durationMinutes: restoreMinutes,
      limitMinutes: DEFAULTS.maxRestoreMinutes,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function evaluateReleaseContinuity(snapshot, findings) {
  let decision = 'restorable';

  if (!snapshot.release?.signedTag) {
    addFinding(findings, 'warning', 'release_tag_unsigned', 'Restored repository version should point to a signed release tag.', {
      snapshotId: snapshot.snapshotId,
      versionId: snapshot.versionId,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (snapshot.release?.forkedFrom && !snapshot.release?.forkLineageVerified) {
    addFinding(findings, 'warning', 'fork_lineage_unverified', 'Forked repository restore needs lineage evidence before release promotion.', {
      snapshotId: snapshot.snapshotId,
      forkedFrom: snapshot.release.forkedFrom,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (!snapshot.citation?.doi || snapshot.citation?.targetStatus !== 'active') {
    addFinding(findings, 'blocker', 'citation_target_unavailable', 'Restored repository version must preserve an active citation target.', {
      snapshotId: snapshot.snapshotId,
      doi: snapshot.citation?.doi || null,
      targetStatus: snapshot.citation?.targetStatus || 'missing',
    });
    decision = worstDecision(decision, 'quarantined');
  }

  return decision;
}

function actionFor(decision) {
  if (decision === 'restorable') {
    return 'approve_restore';
  }
  if (decision === 'needs_review') {
    return 'review_before_release';
  }
  if (decision === 'quarantined') {
    return 'quarantine_snapshot';
  }
  return 'mark_unrecoverable';
}

function evaluateSnapshot(snapshot, checkedAt, findings) {
  let decision = validateIdentity(snapshot, findings);
  decision = worstDecision(decision, evaluateManifest(snapshot, findings));
  decision = worstDecision(decision, evaluateBackup(snapshot, checkedAt, findings));
  decision = worstDecision(decision, evaluateReleaseContinuity(snapshot, findings));

  return {
    repositoryId: snapshot.repositoryId || null,
    versionId: snapshot.versionId || null,
    snapshotId: snapshot.snapshotId || null,
    decision,
    action: actionFor(decision),
    restoreDurationMinutes: snapshot.restoreDrill?.durationMinutes || null,
    backupCopies: snapshot.backup?.copies || 0,
    signedTag: Boolean(snapshot.release?.signedTag),
    citationDoi: snapshot.citation?.doi || null,
    manifestDigest: digest({
      repositoryId: snapshot.repositoryId,
      versionId: snapshot.versionId,
      snapshotId: snapshot.snapshotId,
      expectedHashes: snapshot.expectedHashes || {},
      restoredHashes: snapshot.restoredHashes || {},
      decision,
    }),
  };
}

function buildReviewerTasks(findings, snapshots) {
  const tasks = [];

  if (snapshots.some((snapshot) => snapshot.decision === 'unrecoverable')) {
    tasks.push('Escalate unrecoverable snapshots to repository owners before release or archive promotion.');
  }

  if (findings.some((finding) => finding.code === 'restore_hash_drift' || finding.code === 'lfs_object_unavailable')) {
    tasks.push('Quarantine snapshots with missing LFS objects or manifest hash drift until replacement backups pass rehearsal.');
  }

  if (findings.some((finding) => finding.code === 'restore_rto_exceeded' || finding.code === 'release_tag_unsigned' || finding.code === 'fork_lineage_unverified')) {
    tasks.push('Route warning-level restore cases to repository maintainers for release-readiness review.');
  }

  if (snapshots.every((snapshot) => snapshot.decision === 'restorable')) {
    tasks.push('Approve restored snapshots and attach the audit digest to the repository release packet.');
  }

  return tasks;
}

function evaluateRepositoryRestoreRehearsals(input) {
  const checkedAt = asDate(input.checkedAt) || new Date();
  const findings = [];
  const snapshots = (input.snapshots || []).map((snapshot) => evaluateSnapshot(snapshot, checkedAt, findings));
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    checkedAt: checkedAt.toISOString(),
    decision: snapshots.some((snapshot) => snapshot.decision === 'unrecoverable') ? 'unrecoverable'
      : snapshots.some((snapshot) => snapshot.decision === 'quarantined') ? 'quarantined'
        : snapshots.some((snapshot) => snapshot.decision === 'needs_review') ? 'needs_review'
          : 'restorable',
    summary: {
      totalSnapshots: snapshots.length,
      restorable: snapshots.filter((snapshot) => snapshot.decision === 'restorable').length,
      needsReview: snapshots.filter((snapshot) => snapshot.decision === 'needs_review').length,
      quarantined: snapshots.filter((snapshot) => snapshot.decision === 'quarantined').length,
      unrecoverable: snapshots.filter((snapshot) => snapshot.decision === 'unrecoverable').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    snapshots,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, snapshots),
    releaseHold: snapshots.some((snapshot) => snapshot.decision === 'quarantined' || snapshot.decision === 'unrecoverable'),
    auditDigest: digest({
      checkedAt: checkedAt.toISOString(),
      snapshots,
      findings,
    }),
  };
}

module.exports = {
  evaluateRepositoryRestoreRehearsals,
  stableStringify,
  digest,
};
