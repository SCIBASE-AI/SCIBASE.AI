"use strict";

const FINDINGS = Object.freeze({
  IDENTITY_EVIDENCE_MISSING: {
    severity: "high",
    message: "Fewer than two independent verified identity proofs are present."
  },
  ORCID_CONFLICT: {
    severity: "critical",
    message: "Profile records claim conflicting ORCID identifiers."
  },
  GITHUB_HANDLE_CONFLICT: {
    severity: "high",
    message: "GitHub handles conflict without a verified alias or account migration proof."
  },
  INSTITUTIONAL_EMAIL_UNVERIFIED: {
    severity: "medium",
    message: "Institutional email evidence is missing, unverified, or stale."
  },
  CREDIT_SPIKE_AFTER_MERGE: {
    severity: "medium",
    message: "Projected reputation or credit delta exceeds the configured merge allowance."
  },
  SOURCE_PROFILE_OBJECTION_OPEN: {
    severity: "high",
    message: "Source profile owner or collaborator objection window is not closed."
  },
  PRIVATE_OR_BLIND_REVIEW_LEAK: {
    severity: "critical",
    message: "The merge would expose anonymous, double-blind, or private review history."
  },
  AFFILIATION_APPROVAL_MISSING: {
    severity: "high",
    message: "A governed affiliation merge is missing steward approval."
  },
  DUPLICATE_PUBLICATION_COLLISION: {
    severity: "high",
    message: "The same artifact is claimed by both profiles with conflicting roles or credit."
  },
  AUDIT_RECEIPT_MISSING: {
    severity: "medium",
    message: "The merge packet lacks a durable audit receipt."
  }
});

const SEVERITY_RANK = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
});

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function profileValues(packet, field) {
  const profiles = [packet.primaryProfile, ...(packet.sourceProfiles || [])].filter(Boolean);
  return uniqueNonEmpty(profiles.map((profile) => profile[field]));
}

function verifiedProofTypes(packet) {
  return uniqueNonEmpty(
    (packet.identityProofs || [])
      .filter((proof) => proof.status === "verified")
      .map((proof) => proof.type)
  );
}

function hasVerifiedAliasProof(packet, type) {
  return (packet.identityProofs || []).some(
    (proof) => proof.type === type && proof.status === "verified"
  );
}

function institutionalEmailNeedsReview(packet) {
  const emailProof = (packet.identityProofs || []).find(
    (proof) => proof.type === "institutional_email"
  );

  if (!emailProof || emailProof.status !== "verified") return true;
  if (emailProof.freshnessDays > packet.policy.maxInstitutionalEmailAgeDays) return true;
  return false;
}

function projectedCreditSpike(packet) {
  const preview = packet.reputationPreview || {};
  const before = Number(preview.before || 0);
  const after = Number(preview.after || 0);
  const allowance = Number(preview.maxAllowedDelta || 0);
  return {
    delta: after - before,
    allowance,
    isSpike: after - before > allowance
  };
}

function buildFinding(code, evidence) {
  const base = FINDINGS[code];
  return {
    code,
    severity: base.severity,
    message: base.message,
    evidence
  };
}

function analyzeIdentityMergePacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("analyzeIdentityMergePacket requires a packet object");
  }
  if (!packet.policy) {
    throw new TypeError(`packet ${packet.packetId || "(unknown)"} is missing policy`);
  }

  const findings = [];
  const proofTypes = verifiedProofTypes(packet);
  const orcids = profileValues(packet, "orcid");
  const githubHandles = profileValues(packet, "github");
  const creditSpike = projectedCreditSpike(packet);

  if (proofTypes.length < packet.policy.minimumVerifiedProofTypes) {
    findings.push(
      buildFinding("IDENTITY_EVIDENCE_MISSING", {
        verifiedProofTypes: proofTypes,
        required: packet.policy.minimumVerifiedProofTypes
      })
    );
  }

  if (orcids.length > 1) {
    findings.push(buildFinding("ORCID_CONFLICT", { orcids }));
  }

  if (githubHandles.length > 1 && !hasVerifiedAliasProof(packet, "github_alias")) {
    findings.push(buildFinding("GITHUB_HANDLE_CONFLICT", { githubHandles }));
  }

  if (institutionalEmailNeedsReview(packet)) {
    findings.push(
      buildFinding("INSTITUTIONAL_EMAIL_UNVERIFIED", {
        maxAgeDays: packet.policy.maxInstitutionalEmailAgeDays
      })
    );
  }

  if (creditSpike.isSpike) {
    findings.push(
      buildFinding("CREDIT_SPIKE_AFTER_MERGE", {
        projectedDelta: creditSpike.delta,
        maxAllowedDelta: creditSpike.allowance
      })
    );
  }

  if (packet.objectionWindowStatus !== "closed") {
    findings.push(
      buildFinding("SOURCE_PROFILE_OBJECTION_OPEN", {
        objectionWindowStatus: packet.objectionWindowStatus || "missing"
      })
    );
  }

  if ((packet.privateReviewLinks || []).some((link) => link.mergeVisibility === "expose")) {
    findings.push(
      buildFinding("PRIVATE_OR_BLIND_REVIEW_LEAK", {
        exposedReviewIds: (packet.privateReviewLinks || [])
          .filter((link) => link.mergeVisibility === "expose")
          .map((link) => link.reviewId)
      })
    );
  }

  if (packet.requiresStewardApproval && packet.stewardApprovalStatus !== "approved") {
    findings.push(
      buildFinding("AFFILIATION_APPROVAL_MISSING", {
        stewardApprovalStatus: packet.stewardApprovalStatus || "missing"
      })
    );
  }

  const collisions = (packet.publicationCollisions || []).filter(
    (collision) => collision.status !== "resolved"
  );
  if (collisions.length > 0) {
    findings.push(
      buildFinding("DUPLICATE_PUBLICATION_COLLISION", {
        collisions: collisions.map((collision) => collision.artifactId)
      })
    );
  }

  if (!packet.auditReceiptId) {
    findings.push(buildFinding("AUDIT_RECEIPT_MISSING", { packetId: packet.packetId }));
  }

  const worstRank = Math.max(0, ...findings.map((finding) => SEVERITY_RANK[finding.severity]));
  const decision =
    worstRank >= SEVERITY_RANK.high
      ? "HOLD_MERGE"
      : worstRank >= SEVERITY_RANK.medium
        ? "REVIEW_MERGE"
        : "APPROVE_MERGE";

  return {
    packetId: packet.packetId,
    decision,
    verifiedProofTypes: proofTypes,
    projectedCreditDelta: creditSpike.delta,
    findings,
    reviewerActions: reviewerActionsFor(findings)
  };
}

function reviewerActionsFor(findings) {
  if (findings.length === 0) {
    return ["Approve merge and preserve the audit receipt on both source profiles."];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code.includes("IDENTITY") || finding.code.includes("ORCID")) {
      actions.add("Require verified identity proof before reputation or credit transfer.");
    }
    if (finding.code.includes("GITHUB")) {
      actions.add("Request a signed GitHub alias or account migration receipt.");
    }
    if (finding.code.includes("EMAIL") || finding.code.includes("AFFILIATION")) {
      actions.add("Route the packet to the institutional steward for approval.");
    }
    if (finding.code.includes("CREDIT") || finding.code.includes("PUBLICATION")) {
      actions.add("Freeze public credit deltas until artifact ownership is reconciled.");
    }
    if (finding.code.includes("OBJECTION")) {
      actions.add("Wait for the objection period to close and attach responses.");
    }
    if (finding.code.includes("PRIVATE") || finding.code.includes("BLIND")) {
      actions.add("Redact private review history before any profile consolidation.");
    }
    if (finding.code.includes("AUDIT")) {
      actions.add("Generate an immutable merge receipt before approval.");
    }
  }
  return [...actions];
}

function analyzeIdentityMergePackets(packets) {
  const results = packets.map(analyzeIdentityMergePacket);
  const summary = {
    totalPackets: results.length,
    decisions: {
      APPROVE_MERGE: 0,
      REVIEW_MERGE: 0,
      HOLD_MERGE: 0
    },
    findingCounts: {}
  };

  for (const result of results) {
    summary.decisions[result.decision] += 1;
    for (const finding of result.findings) {
      summary.findingCounts[finding.code] = (summary.findingCounts[finding.code] || 0) + 1;
    }
  }

  return { summary, results };
}

module.exports = {
  FINDINGS,
  analyzeIdentityMergePacket,
  analyzeIdentityMergePackets,
  verifiedProofTypes,
  projectedCreditSpike
};
