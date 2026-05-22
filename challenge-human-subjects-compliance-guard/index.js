function evaluateHumanSubjectsCompliance(packet) {
  const reviewDate = parseDate(packet.reviewDate || new Date().toISOString());
  const challenge = packet.challenge || {};
  const submission = packet.submission || {};
  const artifacts = submission.artifacts || [];
  const reviewers = packet.reviewers || [];
  const regulations = new Set((challenge.regulations || []).map(normalizeToken));
  const blockers = [];
  const warnings = [];
  const readySignals = [];
  const remediationActions = [];

  const humanArtifacts = artifacts.filter((artifact) => artifact.humanSubjectData);
  const requiresHumanSubjectsGuard =
    Boolean(challenge.involvesHumanParticipants) || humanArtifacts.length > 0;

  if (!requiresHumanSubjectsGuard) {
    readySignals.push("Challenge packet does not include human-subject data.");
  } else {
    evaluateEthicsApproval(submission.ethicsApproval, challenge, reviewDate, blockers, warnings, readySignals, remediationActions);
    evaluateConsent(submission.consent, challenge, blockers, warnings, readySignals, remediationActions);
    evaluateHumanArtifacts(humanArtifacts, challenge, blockers, warnings, readySignals, remediationActions);
    evaluateRegulatoryControls(packet, regulations, blockers, warnings, readySignals, remediationActions);
    evaluateReviewerAccess(reviewers, humanArtifacts, challenge, blockers, warnings, readySignals, remediationActions);
    evaluateRewardAndIpGate(submission.rewardAndIp, blockers, warnings, readySignals, remediationActions);
  }

  const status = blockers.length > 0 ? "hold" : warnings.length > 0 ? "review" : "ready";
  const reviewerPacket = buildReviewerPacket(packet, status, blockers, warnings, readySignals);

  return {
    challengeId: challenge.id,
    submissionId: submission.id,
    teamId: submission.teamId,
    status,
    blockers,
    warnings,
    readySignals,
    remediationActions: unique(remediationActions),
    reviewerPacket,
    auditDigest: buildAuditDigest(challenge.id, submission.id, status, blockers, warnings),
  };
}

function evaluateEthicsApproval(approval, challenge, reviewDate, blockers, warnings, readySignals, remediationActions) {
  if (!approval || !approval.status) {
    blockers.push({
      code: "MISSING_ETHICS_APPROVAL",
      severity: "hold",
      message: "Human-subject challenge requires IRB, ethics board, or documented exemption evidence.",
    });
    remediationActions.push("Attach ethics approval, exemption, or waiver evidence before sponsor review.");
    return;
  }

  const status = normalizeToken(approval.status);
  const acceptable = ["approved", "exempt", "waived"].includes(status);
  if (!acceptable) {
    blockers.push({
      code: "ETHICS_APPROVAL_NOT_ACTIVE",
      severity: "hold",
      message: `Ethics approval status '${approval.status}' is not acceptable for review.`,
    });
    remediationActions.push("Resolve pending or rejected ethics approval before exposing the submission.");
  } else {
    readySignals.push(`Ethics status is ${status} for protocol ${approval.protocolId || "unlisted"}.`);
  }

  if (!approval.protocolId) {
    warnings.push({
      code: "MISSING_PROTOCOL_ID",
      severity: "review",
      message: "Ethics evidence is present but does not include a protocol identifier.",
    });
    remediationActions.push("Record a protocol ID so the arbitration packet can be independently checked.");
  }

  if (approval.expiresAt) {
    const expiry = parseDate(approval.expiresAt);
    if (expiry < reviewDate) {
      blockers.push({
        code: "ETHICS_APPROVAL_EXPIRED",
        severity: "hold",
        message: `Ethics approval expired on ${approval.expiresAt}.`,
      });
      remediationActions.push("Refresh ethics approval before final scoring or payout.");
    } else if (daysBetween(reviewDate, expiry) <= 30) {
      warnings.push({
        code: "ETHICS_APPROVAL_EXPIRING_SOON",
        severity: "review",
        message: `Ethics approval expires soon on ${approval.expiresAt}.`,
      });
      remediationActions.push("Confirm the approval window covers the full evaluation and appeal period.");
    }
  }

  if ((challenge.participantGroups || []).includes("minors") && !approval.vulnerablePopulationReview) {
    blockers.push({
      code: "MISSING_VULNERABLE_POPULATION_REVIEW",
      severity: "hold",
      message: "Minor or vulnerable participant data requires explicit vulnerable-population review evidence.",
    });
    remediationActions.push("Attach vulnerable-population review language or remove that data from the submission.");
  }
}

function evaluateConsent(consent, challenge, blockers, warnings, readySignals, remediationActions) {
  const groups = challenge.participantGroups || [];
  if (groups.length === 0) {
    readySignals.push("No participant groups require consent coverage.");
    return;
  }

  if (!consent || (!consent.formId && !consent.waiverId)) {
    blockers.push({
      code: "MISSING_CONSENT_COVERAGE",
      severity: "hold",
      message: "Submission lacks participant consent or waiver evidence for the declared groups.",
    });
    remediationActions.push("Attach consent, assent, or waiver evidence mapped to each participant group.");
    return;
  }

  const missingGroups = groups.filter((group) => !(consent.coveredGroups || []).includes(group));
  if (missingGroups.length > 0) {
    blockers.push({
      code: "CONSENT_GROUP_GAP",
      severity: "hold",
      message: `Consent coverage is missing for: ${missingGroups.join(", ")}.`,
    });
    remediationActions.push("Map consent or waiver evidence to every declared participant group.");
  } else {
    readySignals.push("Consent or waiver evidence covers all declared participant groups.");
  }

  if (!consent.allowsPrizeChallengeUse) {
    blockers.push({
      code: "CONSENT_USE_MISMATCH",
      severity: "hold",
      message: "Consent terms do not explicitly allow prize challenge analysis and review.",
    });
    remediationActions.push("Confirm challenge participation is within consented research use.");
  }

  if (consent.withdrawalWindowOpen) {
    warnings.push({
      code: "WITHDRAWAL_WINDOW_OPEN",
      severity: "review",
      message: "Participant withdrawal window is still open during challenge evaluation.",
    });
    remediationActions.push("Delay final award review until the withdrawal window closes or freeze affected rows.");
  }
}

function evaluateHumanArtifacts(humanArtifacts, challenge, blockers, warnings, readySignals, remediationActions) {
  if (humanArtifacts.length === 0) {
    readySignals.push("No submitted artifacts contain human-subject data.");
    return;
  }

  for (const artifact of humanArtifacts) {
    if (!artifact.checksum) {
      blockers.push({
        code: "MISSING_ARTIFACT_CHECKSUM",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} lacks a frozen checksum.`,
      });
      remediationActions.push(`Freeze ${artifact.label || artifact.id} with a checksum before reviewer access.`);
    }

    if (artifact.directIdentifiersPresent) {
      blockers.push({
        code: "DIRECT_IDENTIFIERS_PRESENT",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} still contains direct identifiers.`,
      });
      remediationActions.push(`Remove direct identifiers from ${artifact.label || artifact.id} or keep it outside the challenge workspace.`);
    }

    if (!["aggregate", "deidentified", "synthetic", "controlled"].includes(normalizeToken(artifact.privacyLevel))) {
      blockers.push({
        code: "UNSUPPORTED_PRIVACY_LEVEL",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} must be aggregate, deidentified, synthetic, or controlled.`,
      });
      remediationActions.push(`Classify privacy level for ${artifact.label || artifact.id} and restrict access accordingly.`);
    }

    if (artifact.reidentificationRisk === "high") {
      blockers.push({
        code: "HIGH_REIDENTIFICATION_RISK",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} has high re-identification risk.`,
      });
      remediationActions.push(`Reduce quasi-identifier detail or move ${artifact.label || artifact.id} into controlled access.`);
    } else if (artifact.reidentificationRisk === "medium") {
      warnings.push({
        code: "MEDIUM_REIDENTIFICATION_RISK",
        severity: "review",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} needs reviewer confirmation for medium re-identification risk.`,
      });
    }

    if (challenge.visibility === "public" && normalizeToken(artifact.privacyLevel) === "controlled") {
      blockers.push({
        code: "CONTROLLED_DATA_IN_PUBLIC_CHALLENGE",
        severity: "hold",
        artifactId: artifact.id,
        message: "Controlled human-subject data cannot be exposed in a public challenge workspace.",
      });
      remediationActions.push("Move controlled data to a private workspace or publish only aggregate artifacts.");
    }
  }

  readySignals.push(`${humanArtifacts.length} human-subject artifact(s) were inspected for identifiers, privacy level, and checksum state.`);
}

function evaluateRegulatoryControls(packet, regulations, blockers, warnings, readySignals, remediationActions) {
  const controls = packet.regulatoryControls || {};

  if (regulations.has("hipaa") && !controls.hipaaMinimumNecessary) {
    blockers.push({
      code: "HIPAA_MINIMUM_NECESSARY_MISSING",
      severity: "hold",
      message: "HIPAA-scoped submission lacks minimum-necessary review evidence.",
    });
    remediationActions.push("Attach minimum-necessary review before sponsor or reviewer access.");
  }

  if (regulations.has("gdpr")) {
    if (!controls.lawfulBasis) {
      blockers.push({
        code: "GDPR_LAWFUL_BASIS_MISSING",
        severity: "hold",
        message: "GDPR-scoped submission lacks a lawful basis for challenge processing.",
      });
      remediationActions.push("Record lawful basis and data subject rights route before evaluation.");
    }
    if (controls.crossBorderTransfer && !controls.transferMechanism) {
      blockers.push({
        code: "GDPR_TRANSFER_MECHANISM_MISSING",
        severity: "hold",
        message: "Cross-border processing is enabled without a transfer mechanism.",
      });
      remediationActions.push("Add SCC, adequacy, or other transfer mechanism evidence.");
    }
  }

  if ((regulations.has("hipaa") || regulations.has("gdpr")) && !controls.dataUseAgreementId) {
    blockers.push({
      code: "DATA_USE_AGREEMENT_MISSING",
      severity: "hold",
      message: "Human-subject data processing requires a data-use agreement or equivalent control.",
    });
    remediationActions.push("Attach DUA or equivalent controlled-access agreement.");
  }

  if (controls.privacyContact) {
    readySignals.push(`Privacy escalation contact recorded: ${controls.privacyContact}.`);
  } else if (regulations.size > 0) {
    warnings.push({
      code: "MISSING_PRIVACY_CONTACT",
      severity: "review",
      message: "No privacy escalation contact is recorded for regulated data.",
    });
  }
}

function evaluateReviewerAccess(reviewers, humanArtifacts, challenge, blockers, warnings, readySignals, remediationActions) {
  if (humanArtifacts.length === 0) return;

  if (reviewers.length === 0) {
    blockers.push({
      code: "NO_REVIEWER_ACCESS_PLAN",
      severity: "hold",
      message: "Human-subject submission needs a named reviewer access plan.",
    });
    remediationActions.push("Assign trained reviewers with least-privilege access before opening evaluation.");
    return;
  }

  for (const reviewer of reviewers) {
    if (!reviewer.humanSubjectsTrainingCurrent) {
      blockers.push({
        code: "REVIEWER_TRAINING_MISSING",
        severity: "hold",
        reviewerId: reviewer.id,
        message: `${reviewer.name || reviewer.id} lacks current human-subjects training.`,
      });
      remediationActions.push(`Update human-subjects training for ${reviewer.name || reviewer.id}.`);
    }

    if (!reviewer.conflictDeclarationSigned) {
      blockers.push({
        code: "REVIEWER_CONFLICT_DECLARATION_MISSING",
        severity: "hold",
        reviewerId: reviewer.id,
        message: `${reviewer.name || reviewer.id} has not signed a conflict declaration.`,
      });
      remediationActions.push(`Collect conflict declaration from ${reviewer.name || reviewer.id}.`);
    }

    const access = new Set((reviewer.access || []).map(normalizeToken));
    if (access.has("raw-data") && challenge.visibility !== "private") {
      blockers.push({
        code: "RAW_DATA_ACCESS_OUTSIDE_PRIVATE_CHALLENGE",
        severity: "hold",
        reviewerId: reviewer.id,
        message: `${reviewer.name || reviewer.id} has raw-data access outside a private challenge.`,
      });
      remediationActions.push("Limit raw-data access to private challenge reviewers only.");
    }

    if (reviewer.accessExpiresAt && parseDate(reviewer.accessExpiresAt) < parseDate(challenge.evaluationEndsAt || "9999-12-31")) {
      warnings.push({
        code: "REVIEWER_ACCESS_EXPIRES_BEFORE_EVALUATION_END",
        severity: "review",
        reviewerId: reviewer.id,
        message: `${reviewer.name || reviewer.id} access expires before the evaluation window ends.`,
      });
    }
  }

  readySignals.push(`${reviewers.length} reviewer access record(s) were checked for training, conflicts, and least privilege.`);
}

function evaluateRewardAndIpGate(rewardAndIp, blockers, warnings, readySignals, remediationActions) {
  if (!rewardAndIp) {
    warnings.push({
      code: "MISSING_REWARD_IP_GATE",
      severity: "review",
      message: "Submission does not state how compliance gates payout and IP transfer.",
    });
    remediationActions.push("Add reward and IP gate language before award approval.");
    return;
  }

  if (rewardAndIp.ipReleaseBeforeCompliance) {
    blockers.push({
      code: "IP_RELEASE_BEFORE_COMPLIANCE",
      severity: "hold",
      message: "IP release is configured before human-subject compliance approval.",
    });
    remediationActions.push("Gate IP transfer until compliance hold is cleared and payout is approved.");
  }

  if (rewardAndIp.payoutBeforeCompliance) {
    blockers.push({
      code: "PAYOUT_BEFORE_COMPLIANCE",
      severity: "hold",
      message: "Payout is configured before human-subject compliance approval.",
    });
    remediationActions.push("Hold payout until compliance approval is recorded.");
  }

  if (!rewardAndIp.sponsorAcknowledgedComplianceHold) {
    warnings.push({
      code: "SPONSOR_HOLD_ACK_MISSING",
      severity: "review",
      message: "Sponsor has not acknowledged that compliance blockers can hold review, payout, or IP transfer.",
    });
  } else {
    readySignals.push("Sponsor acknowledged compliance gates for review, payout, and IP transfer.");
  }
}

function buildReviewerPacket(packet, status, blockers, warnings, readySignals) {
  return {
    challengeTitle: packet.challenge?.title,
    submissionTitle: packet.submission?.title,
    status,
    requiredDecision: status === "hold" ? "hold_submission" : status === "review" ? "compliance_review" : "release_for_scoring",
    blockerCodes: blockers.map((blocker) => blocker.code),
    warningCodes: warnings.map((warning) => warning.code),
    readySignals,
  };
}

function buildAuditDigest(challengeId, submissionId, status, blockers, warnings) {
  const blockerCodes = blockers.map((blocker) => blocker.code).sort().join("|") || "none";
  const warningCodes = warnings.map((warning) => warning.code).sort().join("|") || "none";
  return `${challengeId || "challenge"}:${submissionId || "submission"}:${status}:B=${blockerCodes}:W=${warningCodes}`;
}

function parseDate(value) {
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date("1970-01-01T00:00:00Z");
  }
  return parsed;
}

function daysBetween(start, end) {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "-");
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  evaluateHumanSubjectsCompliance,
};
