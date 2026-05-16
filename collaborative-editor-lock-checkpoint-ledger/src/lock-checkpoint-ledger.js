"use strict";

const crypto = require("node:crypto");

const DEFAULT_SECRET = "scibase-editor-lock-checkpoint-demo-secret";
const MS_PER_MINUTE = 60 * 1000;

function evaluateCollaborationLedger(ledger, options = {}) {
  if (!ledger || typeof ledger !== "object") {
    throw new Error("A collaboration ledger object is required.");
  }

  const policy = {
    staleLockMinutes: 30,
    autosaveReviewMinutes: 5,
    autosaveBlockerMinutes: 30,
    maxUnsyncedOperations: 8,
    ...(ledger.policy || {})
  };
  const asOf = new Date(ledger.asOf);
  const documents = (ledger.documents || []).map((document) => evaluateDocument(document, policy, asOf));

  return {
    schemaVersion: "2026-05-16.collaborative-editor-lock-checkpoint-ledger.v1",
    asOf: ledger.asOf,
    policy,
    summary: summarizeDocuments(documents),
    documents,
    signedAuditEvents: documents.map((document) =>
      signAuditEvent(
        {
          type: "collaborative_editor.lock_checkpoint.evaluated",
          asOf: ledger.asOf,
          documentId: document.documentId,
          recoveryStatus: document.recoveryStatus,
          blockerCount: document.actionCounts.blocker,
          reviewCount: document.actionCounts.review,
          latestCheckpointAgeMinutes: document.latestCheckpointAgeMinutes
        },
        options.secret || DEFAULT_SECRET
      )
    )
  };
}

function evaluateDocument(document, policy, asOf) {
  const sectionLocks = buildSectionLocks(document.sections || []);
  const activeUsers = buildActiveUsers(document.presence || [], asOf, policy.staleLockMinutes);
  const findings = [
    ...assessSectionLocks(document, sectionLocks, activeUsers, policy, asOf),
    ...assessPendingOperations(document.pendingOperations || [], sectionLocks),
    ...assessLocalCaches(document.localCaches || [], policy, asOf),
    ...assessCheckpoints(document, policy, asOf),
    ...assessNamedVersions(document),
    ...assessBlockingWork(document, sectionLocks)
  ].sort((left, right) => severityRank(left.severity) - severityRank(right.severity) || left.scope.localeCompare(right.scope));
  const actionCounts = countFindings(findings);
  const recoveryStatus = decideRecoveryStatus(actionCounts);
  const latestCheckpoint = latestByDate(document.checkpoints || [], "createdAt");
  const latestCheckpointAgeMinutes = latestCheckpoint ? minutesBetween(asOf, latestCheckpoint.createdAt) : null;

  return {
    documentId: document.documentId,
    title: document.title,
    status: document.status,
    recoveryStatus,
    actionCounts,
    latestCheckpointAgeMinutes,
    lockSummary: summarizeLocks(document.sections || [], activeUsers, asOf),
    restorePlan: buildRestorePlan(document, findings, latestCheckpoint),
    findings,
    auditDigest: digest({
      documentId: document.documentId,
      recoveryStatus,
      findings,
      latestCheckpoint
    })
  };
}

function assessSectionLocks(document, sectionLocks, activeUsers, policy, asOf) {
  const findings = [];

  for (const [sectionId, lock] of sectionLocks) {
    const expired = lock.expiresAt && new Date(lock.expiresAt) < asOf;
    const lockAgeMinutes = minutesBetween(asOf, lock.lockedAt);
    const ownerActive = activeUsers.has(lock.ownerId);
    const stale = expired || (lockAgeMinutes > policy.staleLockMinutes && !ownerActive);

    if (stale) {
      findings.push(
        blocker(
          "stale-lock",
          sectionId,
          `${sectionId} is locked by ${lock.ownerId} but the lock is stale`,
          "Recover or transfer the section lock before accepting new edits."
        )
      );
    } else if (!lock.reason) {
      findings.push(
        review(
          "lock-policy",
          sectionId,
          `${sectionId} has an active lock without a reason`,
          "Require a human-readable lock reason for controlled scientific sections."
        )
      );
    }

    if (document.status === "finalizing" && lock.mode !== "hard" && sectionId.includes("figure")) {
      findings.push(
        review(
          "lock-policy",
          sectionId,
          `${sectionId} is a finalizing figure section without a hard lock`,
          "Use a hard lock for final figures, tables, datasets, and executable outputs."
        )
      );
    }
  }

  return findings;
}

function assessPendingOperations(operations, sectionLocks) {
  return operations
    .filter((operation) => {
      const lock = sectionLocks.get(operation.sectionId);
      return lock && operation.userId !== lock.ownerId;
    })
    .map((operation) =>
      blocker(
        "locked-section-edit",
        operation.operationId,
        `${operation.operationId} edits locked section ${operation.sectionId} as ${operation.userId}`,
        "Queue the operation for owner approval or rebase it after lock transfer."
      )
    );
}

function assessLocalCaches(caches, policy, asOf) {
  const findings = [];

  for (const cache of caches) {
    const ageMinutes = minutesBetween(asOf, cache.lastSyncedAt);
    if (ageMinutes >= policy.autosaveBlockerMinutes || cache.unsyncedOperations >= policy.maxUnsyncedOperations) {
      findings.push(
        blocker(
          "autosave",
          cache.clientId,
          `${cache.clientId} has ${cache.unsyncedOperations} unsynced operation(s) and last synced ${ageMinutes} minute(s) ago`,
          "Force a checkpoint or local-cache recovery before more collaborative edits are accepted."
        )
      );
    } else if (ageMinutes >= policy.autosaveReviewMinutes || cache.unsyncedOperations > 0) {
      findings.push(
        review(
          "autosave",
          cache.clientId,
          `${cache.clientId} has pending local edits`,
          "Confirm autosave synchronization and conflict-free checkpointing."
        )
      );
    }
  }

  return findings;
}

function assessCheckpoints(document, policy, asOf) {
  const checkpoints = document.checkpoints || [];
  const latestCheckpoint = latestByDate(checkpoints, "createdAt");

  if (!latestCheckpoint) {
    return [
      blocker(
        "checkpoint",
        document.documentId,
        `${document.documentId} has no autosave checkpoint`,
        "Create a restore-ready checkpoint before collaborative editing continues."
      )
    ];
  }

  const findings = [];
  const ageMinutes = minutesBetween(asOf, latestCheckpoint.createdAt);
  if (ageMinutes >= policy.autosaveBlockerMinutes) {
    findings.push(
      blocker(
        "checkpoint",
        latestCheckpoint.checkpointId,
        `${latestCheckpoint.checkpointId} is ${ageMinutes} minute(s) old`,
        "Create a fresh checkpoint before accepting more edits."
      )
    );
  } else if (ageMinutes >= policy.autosaveReviewMinutes) {
    findings.push(
      review(
        "checkpoint",
        latestCheckpoint.checkpointId,
        `${latestCheckpoint.checkpointId} is older than the review threshold`,
        "Verify autosave cadence before finalizing the document."
      )
    );
  }

  if (!latestCheckpoint.contentHash) {
    findings.push(
      blocker(
        "checkpoint-integrity",
        latestCheckpoint.checkpointId,
        `${latestCheckpoint.checkpointId} has no content hash`,
        "Hash every checkpoint so time-machine restores are verifiable."
      )
    );
  }

  return findings;
}

function assessNamedVersions(document) {
  const namedVersions = document.namedVersions || [];
  const afterMilestone = namedVersions.filter((version) => new Date(version.createdAt) >= new Date(document.lastMajorMilestoneAt || 0));

  if (document.status === "finalizing" && afterMilestone.length === 0) {
    return [
      blocker(
        "named-version",
        document.documentId,
        `${document.documentId} has no named version after the latest milestone`,
        "Create a named restore point such as Submission candidate or Figure freeze."
      )
    ];
  }

  if (document.status !== "finalizing" && namedVersions.length === 0) {
    return [
      review(
        "named-version",
        document.documentId,
        `${document.documentId} has no named restore point`,
        "Add a named version before major coauthor review."
      )
    ];
  }

  return namedVersions
    .filter((version) => !version.contentHash)
    .map((version) =>
      blocker(
        "named-version-integrity",
        version.versionId,
        `${version.versionId} has no content hash`,
        "Hash named versions for reliable time-machine comparisons."
      )
    );
}

function assessBlockingWork(document, sectionLocks) {
  const findings = [];

  for (const task of document.tasks || []) {
    if (task.blocking && task.status !== "done") {
      const severity = sectionLocks.has(task.sectionId) ? "blocker" : "review";
      findings.push(
        finding(
          severity,
          "blocking-task",
          task.taskId,
          `${task.taskId} is unresolved on section ${task.sectionId}`,
          "Resolve or explicitly waive blocking section tasks before restore approval."
        )
      );
    }
  }

  for (const comment of document.comments || []) {
    if (comment.blocking && !comment.resolved) {
      const severity = sectionLocks.has(comment.sectionId) ? "blocker" : "review";
      findings.push(
        finding(
          severity,
          "blocking-comment",
          comment.commentId,
          `${comment.commentId} is unresolved on section ${comment.sectionId}`,
          "Resolve blocking comments before release or transfer the locked section for review."
        )
      );
    }
  }

  return findings;
}

function buildRestorePlan(document, findings, latestCheckpoint) {
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  return {
    recommendation: blockers.length > 0 ? "recover_before_editing" : findings.length > 0 ? "review_before_finalizing" : "restore_ready",
    checkpointId: latestCheckpoint ? latestCheckpoint.checkpointId : null,
    checkpointHash: latestCheckpoint ? latestCheckpoint.contentHash || null : null,
    requiredActions: findings.map((finding) => finding.remediation),
    canRestoreSafely: blockers.length === 0 && Boolean(latestCheckpoint && latestCheckpoint.contentHash)
  };
}

function summarizeLocks(sections, activeUsers, asOf) {
  return sections
    .filter((section) => section.lock)
    .map((section) => ({
      sectionId: section.sectionId,
      ownerId: section.lock.ownerId,
      mode: section.lock.mode,
      ownerActive: activeUsers.has(section.lock.ownerId),
      ageMinutes: minutesBetween(asOf, section.lock.lockedAt)
    }));
}

function buildSectionLocks(sections) {
  return new Map(sections.filter((section) => section.lock).map((section) => [section.sectionId, section.lock]));
}

function buildActiveUsers(presence, asOf, activeWindowMinutes) {
  return new Set(
    presence
      .filter((presenceEntry) => minutesBetween(asOf, presenceEntry.lastSeenAt) <= activeWindowMinutes)
      .map((presenceEntry) => presenceEntry.userId)
  );
}

function summarizeDocuments(documents) {
  const summary = documents.reduce(
    (accumulator, document) => {
      accumulator.totalDocuments += 1;
      accumulator[document.recoveryStatus] += 1;
      accumulator.blockers += document.actionCounts.blocker;
      accumulator.reviews += document.actionCounts.review;
      return accumulator;
    },
    {
      totalDocuments: 0,
      ready: 0,
      needs_review: 0,
      blocked: 0,
      blockers: 0,
      reviews: 0
    }
  );

  return summary;
}

function latestByDate(items, field) {
  return items.reduce((latest, item) => {
    if (!latest || new Date(item[field]) > new Date(latest[field])) {
      return item;
    }
    return latest;
  }, null);
}

function decideRecoveryStatus(actionCounts) {
  if (actionCounts.blocker > 0) {
    return "blocked";
  }

  if (actionCounts.review > 0) {
    return "needs_review";
  }

  return "ready";
}

function countFindings(findings) {
  return findings.reduce(
    (counts, findingItem) => {
      counts[findingItem.severity] += 1;
      return counts;
    },
    { blocker: 0, review: 0, note: 0 }
  );
}

function blocker(scope, target, message, remediation) {
  return finding("blocker", scope, target, message, remediation);
}

function review(scope, target, message, remediation) {
  return finding("review", scope, target, message, remediation);
}

function finding(severity, scope, target, message, remediation) {
  return {
    severity,
    scope,
    target,
    message,
    remediation
  };
}

function severityRank(severity) {
  return { blocker: 0, review: 1, note: 2 }[severity] || 3;
}

function minutesBetween(asOf, earlier) {
  return Math.max(0, Math.round((new Date(asOf) - new Date(earlier)) / MS_PER_MINUTE));
}

function signAuditEvent(payload, secret = DEFAULT_SECRET) {
  const canonical = stableStringify(payload);
  return {
    payload,
    digest: digest(payload),
    signature: crypto.createHmac("sha256", secret).update(canonical).digest("hex"),
    algorithm: "hmac-sha256"
  };
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

module.exports = {
  assessCheckpoints,
  assessLocalCaches,
  assessPendingOperations,
  assessSectionLocks,
  decideRecoveryStatus,
  digest,
  evaluateCollaborationLedger,
  evaluateDocument,
  signAuditEvent,
  stableStringify
};
