'use strict';

const crypto = require('crypto');

const REQUIRED_EVIDENCE = {
  subscription: ['contract', 'entitlement_snapshot', 'invoice', 'payment_or_po'],
  ai_compute: ['job_manifest', 'meter_reading', 'cost_trace', 'customer_usage_summary'],
  analytics_license: ['license_terms', 'export_manifest', 'privacy_review', 'customer_usage_summary'],
};

const RETENTION_YEARS = {
  individual: 3,
  lab: 5,
  institutional: 5,
  government: 7,
};

const DECISION_RANK = {
  release_revenue: 0,
  release_with_controls: 1,
  hold_revenue: 2,
  quarantine_revenue: 3,
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

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

function addYears(date, years) {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, evidence });
}

function evidenceFingerprint(evidence) {
  return (evidence || []).map((entry) => ({
    type: entry.type,
    sourceSystem: entry.sourceSystem,
    capturedAt: entry.capturedAt,
    sha256: entry.sha256,
    immutable: entry.immutable === true,
  }));
}

function expectedEvidenceRoot(packet) {
  return digest({
    invoiceId: packet.invoiceId,
    stream: packet.stream,
    evidence: evidenceFingerprint(packet.evidence),
  });
}

function countByType(evidence) {
  return (evidence || []).reduce((counts, entry) => {
    counts[entry.type] = (counts[entry.type] || 0) + 1;
    return counts;
  }, {});
}

function evaluateRequiredEvidence(packet, findings) {
  const required = REQUIRED_EVIDENCE[packet.stream] || [];
  const counts = countByType(packet.evidence);
  const missing = required.filter((type) => !counts[type]);

  if (missing.length > 0) {
    addFinding(findings, 'blocker', 'required_evidence_missing', 'Revenue evidence packet is missing required proof types.', {
      invoiceId: packet.invoiceId,
      stream: packet.stream,
      missing,
    });
  }

  (packet.evidence || []).forEach((entry) => {
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 || '')) {
      addFinding(findings, 'blocker', 'evidence_hash_invalid', 'Evidence item does not carry a valid SHA-256 digest.', {
        invoiceId: packet.invoiceId,
        evidenceId: entry.id,
        type: entry.type,
      });
    }
    if (entry.immutable !== true) {
      addFinding(findings, 'blocker', 'evidence_not_immutable', 'Evidence item is not marked immutable before revenue release.', {
        invoiceId: packet.invoiceId,
        evidenceId: entry.id,
        type: entry.type,
      });
    }
    if (!entry.sourceSystem || !entry.capturedAt) {
      addFinding(findings, 'blocker', 'evidence_lineage_incomplete', 'Evidence item lacks source-system or capture-time lineage.', {
        invoiceId: packet.invoiceId,
        evidenceId: entry.id,
        type: entry.type,
      });
    }
    if ((entry.replicas || 0) < 2) {
      addFinding(findings, 'warning', 'evidence_replica_count_low', 'Evidence has fewer than two storage replicas.', {
        invoiceId: packet.invoiceId,
        evidenceId: entry.id,
        replicas: entry.replicas || 0,
      });
    }
  });
}

function evaluateRetention(packet, findings) {
  const invoiceDate = parseDate(packet.invoiceDate, 'invoiceDate');
  const retainedUntil = parseDate(packet.retainedUntil, 'retainedUntil');
  const storageLockUntil = parseDate(packet.storageLockUntil, 'storageLockUntil');
  const disputeDeadline = parseDate(packet.disputeDeadline, 'disputeDeadline');
  const requiredYears = RETENTION_YEARS[packet.customerSegment] || RETENTION_YEARS.institutional;
  const requiredRetentionDate = addYears(invoiceDate, requiredYears);

  if (retainedUntil < requiredRetentionDate) {
    addFinding(findings, 'blocker', 'retention_window_too_short', 'Revenue evidence retention is shorter than policy requires.', {
      invoiceId: packet.invoiceId,
      retainedUntil: dateOnly(retainedUntil),
      requiredUntil: dateOnly(requiredRetentionDate),
      requiredYears,
    });
  }

  if (storageLockUntil < disputeDeadline) {
    addFinding(findings, 'blocker', 'immutability_lock_before_dispute_deadline', 'Evidence lock expires before the customer dispute window closes.', {
      invoiceId: packet.invoiceId,
      storageLockUntil: dateOnly(storageLockUntil),
      disputeDeadline: dateOnly(disputeDeadline),
    });
  }
}

function evaluateEvidenceRoot(packet, findings) {
  const expected = expectedEvidenceRoot(packet);
  if (packet.evidenceRoot !== expected) {
    addFinding(findings, 'blocker', 'evidence_root_mismatch', 'Evidence root does not match the invoice evidence packet.', {
      invoiceId: packet.invoiceId,
      expected,
      actual: packet.evidenceRoot || null,
    });
  }
}

function evaluateLicensePrivacy(packet, findings) {
  if (packet.stream !== 'analytics_license') {
    return;
  }

  const privateEvidence = (packet.evidence || []).filter((entry) => entry.containsPrivateContent === true);
  if (privateEvidence.length > 0) {
    addFinding(findings, 'blocker', 'private_content_in_license_export', 'Analytics licensing evidence includes private content.', {
      invoiceId: packet.invoiceId,
      evidenceIds: privateEvidence.map((entry) => entry.id),
    });
  }

  const privacyReviews = (packet.evidence || []).filter((entry) => entry.type === 'privacy_review');
  if (!privacyReviews.some((entry) => entry.approved === true)) {
    addFinding(findings, 'blocker', 'privacy_review_not_approved', 'Analytics licensing revenue lacks an approved privacy review.', {
      invoiceId: packet.invoiceId,
    });
  }
}

function evaluateLegalHold(packet, findings) {
  if (!packet.legalHold || packet.legalHold.active !== true) {
    return;
  }

  const holdUntil = parseDate(packet.legalHold.holdUntil, 'legalHold.holdUntil');
  const riskyDeletes = (packet.deletionRequests || []).filter((request) => {
    const requestedAt = parseDate(request.scheduledFor, 'deletionRequests.scheduledFor');
    return requestedAt < holdUntil && request.status !== 'blocked';
  });

  if (riskyDeletes.length > 0) {
    addFinding(findings, 'blocker', 'legal_hold_deletion_conflict', 'Deletion request conflicts with an active revenue evidence legal hold.', {
      invoiceId: packet.invoiceId,
      holdUntil: dateOnly(holdUntil),
      deletionRequestIds: riskyDeletes.map((request) => request.id),
    });
  }
}

function evaluatePacket(packet) {
  const findings = [];
  evaluateRequiredEvidence(packet, findings);
  evaluateRetention(packet, findings);
  evaluateEvidenceRoot(packet, findings);
  evaluateLicensePrivacy(packet, findings);
  evaluateLegalHold(packet, findings);

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  let decision = blockers.length > 0 ? 'hold_revenue' : 'release_revenue';
  if (blockers.some((finding) => finding.code === 'private_content_in_license_export' || finding.code === 'legal_hold_deletion_conflict')) {
    decision = worstDecision(decision, 'quarantine_revenue');
  } else if (warnings.length > 0) {
    decision = worstDecision(decision, 'release_with_controls');
  }

  return {
    invoiceId: packet.invoiceId,
    customerId: packet.customerId,
    stream: packet.stream,
    amountCents: packet.amountCents,
    decision,
    requiredEvidence: REQUIRED_EVIDENCE[packet.stream] || [],
    evidenceCount: (packet.evidence || []).length,
    retainedUntil: packet.retainedUntil,
    storageLockUntil: packet.storageLockUntil,
    evidenceRoot: packet.evidenceRoot,
    blockers,
    warnings,
    reviewerPacketDigest: digest({
      invoiceId: packet.invoiceId,
      decision,
      blockers,
      warnings,
      evidenceRoot: packet.evidenceRoot,
    }),
  };
}

function buildFinanceTasks(packetResults) {
  const tasks = [];
  if (packetResults.some((packet) => packet.blockers.some((finding) => finding.code === 'required_evidence_missing'))) {
    tasks.push('Attach missing contract, usage, cost, invoice, or privacy-review evidence before booking revenue.');
  }
  if (packetResults.some((packet) => packet.blockers.some((finding) => finding.code === 'retention_window_too_short' || finding.code === 'immutability_lock_before_dispute_deadline'))) {
    tasks.push('Extend evidence retention and storage lock periods to satisfy customer and audit windows.');
  }
  if (packetResults.some((packet) => packet.blockers.some((finding) => finding.code === 'private_content_in_license_export' || finding.code === 'privacy_review_not_approved'))) {
    tasks.push('Quarantine analytics licensing exports until privacy approval proves no private content is monetized.');
  }
  if (packetResults.some((packet) => packet.blockers.some((finding) => finding.code === 'legal_hold_deletion_conflict'))) {
    tasks.push('Block deletion jobs that conflict with revenue evidence legal holds.');
  }
  if (packetResults.some((packet) => packet.warnings.some((finding) => finding.code === 'evidence_replica_count_low'))) {
    tasks.push('Increase evidence replication for release-with-controls invoices.');
  }
  if (tasks.length === 0) {
    tasks.push('Release all revenue packets and archive evidence roots for audit sampling.');
  }
  return tasks;
}

function evaluateRevenueEvidenceRetentionGuard(register) {
  const packets = (register.invoicePackets || []).map(evaluatePacket);
  const revenueAtRiskCents = packets
    .filter((packet) => packet.decision === 'hold_revenue' || packet.decision === 'quarantine_revenue')
    .reduce((sum, packet) => sum + packet.amountCents, 0);

  return {
    checkedAt: register.checkedAt,
    decision: packets.some((packet) => packet.decision === 'quarantine_revenue') ? 'quarantine_revenue'
      : packets.some((packet) => packet.decision === 'hold_revenue') ? 'hold_revenue'
        : packets.some((packet) => packet.decision === 'release_with_controls') ? 'release_with_controls'
          : 'release_revenue',
    summary: {
      totalPackets: packets.length,
      releaseRevenue: packets.filter((packet) => packet.decision === 'release_revenue').length,
      releaseWithControls: packets.filter((packet) => packet.decision === 'release_with_controls').length,
      holdRevenue: packets.filter((packet) => packet.decision === 'hold_revenue').length,
      quarantineRevenue: packets.filter((packet) => packet.decision === 'quarantine_revenue').length,
      revenueAtRiskCents,
    },
    packets,
    financeTasks: buildFinanceTasks(packets),
    auditDigest: digest({
      checkedAt: register.checkedAt,
      packets: packets.map((packet) => ({
        invoiceId: packet.invoiceId,
        decision: packet.decision,
        evidenceRoot: packet.evidenceRoot,
        reviewerPacketDigest: packet.reviewerPacketDigest,
      })),
    }),
  };
}

module.exports = {
  evaluateRevenueEvidenceRetentionGuard,
  expectedEvidenceRoot,
  stableStringify,
  digest,
};
