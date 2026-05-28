"use strict";

function reviewNotebookDiffs(packets) {
  return packets.map(reviewNotebookDiff);
}

function reviewNotebookDiff(packet) {
  validatePacket(packet);

  const findings = [];
  for (const cell of packet.cells) {
    findings.push(...reviewCell(packet, cell));
  }

  return {
    repositoryId: packet.repositoryId,
    notebookPath: packet.notebookPath,
    commitSha: packet.commitSha,
    decision: findings.some((item) => item.severity === "block") ? "block" : "ready",
    findings,
    receipt: buildReceipt(packet, findings),
  };
}

function validatePacket(packet) {
  if (!packet.repositoryId || !packet.notebookPath || !packet.commitSha) {
    throw new Error("Notebook diff packet must include repositoryId, notebookPath, and commitSha.");
  }
  if (!Array.isArray(packet.cells)) {
    throw new Error(`${packet.notebookPath} must include cells.`);
  }
}

function reviewCell(packet, cell) {
  const findings = [];
  const codeChanged = Boolean(cell.codeChanged || cell.inputChanged);
  const outputChanged = Boolean(cell.outputChanged);
  const executionRecorded = Boolean(cell.executionRecordId);
  const environmentChanged = Boolean(cell.environmentChanged);
  const hasEnvironmentFingerprint = Boolean(packet.environment?.fingerprint);
  const largeOutputDelta = Number(cell.outputBytesAdded ?? 0) + Number(cell.outputBytesRemoved ?? 0) >= packet.policy.largeOutputDeltaBytes;

  if (outputChanged && !codeChanged && !executionRecorded) {
    findings.push(
      finding(
        "stale_output_change",
        "block",
        cell.id,
        `${cell.id} changes notebook output without code/input changes or an execution record.`,
        "Attach the execution record or revert the unproven output change.",
      ),
    );
  }

  if (codeChanged && !executionRecorded) {
    findings.push(
      finding(
        "missing_execution_record",
        "block",
        cell.id,
        `${cell.id} changes executable content without a recorded run.`,
        "Run the notebook or attach a reviewer-accepted execution receipt.",
      ),
    );
  }

  if (environmentChanged && !hasEnvironmentFingerprint) {
    findings.push(
      finding(
        "missing_environment_fingerprint",
        "block",
        cell.id,
        `${cell.id} depends on an environment change, but no environment fingerprint is present.`,
        "Add a Dockerfile, lockfile, or environment digest to the diff receipt.",
      ),
    );
  }

  if (largeOutputDelta && !cell.reviewerEvidence?.length) {
    findings.push(
      finding(
        "large_output_without_evidence",
        "hold",
        cell.id,
        `${cell.id} changes ${cell.outputBytesAdded + cell.outputBytesRemoved} output bytes without reviewer evidence.`,
        "Add a figure checksum, table digest, screenshot, or run log.",
      ),
    );
  }

  if (outputChanged && cell.beforeOutputDigest === cell.afterOutputDigest) {
    findings.push(
      finding(
        "unchanged_output_digest",
        "hold",
        cell.id,
        `${cell.id} reports an output change but output digests are identical.`,
        "Regenerate output digests or remove the noisy output diff.",
      ),
    );
  }

  return findings;
}

function finding(code, severity, target, message, action) {
  return { code, severity, target, message, action };
}

function buildReceipt(packet, findings) {
  return {
    changedCells: packet.cells.filter((cell) => cell.codeChanged || cell.inputChanged || cell.outputChanged).length,
    executionRecords: Array.from(new Set(packet.cells.map((cell) => cell.executionRecordId).filter(Boolean))),
    environmentFingerprint: packet.environment?.fingerprint ?? null,
    blockedFindings: findings.filter((item) => item.severity === "block").length,
    heldFindings: findings.filter((item) => item.severity === "hold").length,
    nextActions: Array.from(new Set(findings.map((item) => item.action))),
  };
}

function summarizeReports(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1;
      summary.ready += report.decision === "ready" ? 1 : 0;
      summary.blocked += report.decision === "block" ? 1 : 0;
      summary.findings += report.findings.length;
      return summary;
    },
    { total: 0, ready: 0, blocked: 0, findings: 0 },
  );
}

module.exports = {
  reviewNotebookDiff,
  reviewNotebookDiffs,
  summarizeReports,
};
