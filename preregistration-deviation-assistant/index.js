function evaluatePreregistrationDeviation(packet) {
  const manuscript = packet.manuscript || {};
  const registration = packet.registration || {};
  const amendments = registration.amendments || [];
  const blockers = [];
  const warnings = [];
  const readySignals = [];
  const remediationActions = [];

  evaluateRegistrationIdentity(registration, manuscript, blockers, warnings, readySignals, remediationActions);
  evaluateOutcomePlan(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions);
  evaluateAnalysisPlan(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions);
  evaluateSampleAndExclusions(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions);
  evaluateExploratoryClaims(registration, manuscript, blockers, warnings, readySignals, remediationActions);
  evaluateTimeline(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions);

  const status = blockers.length > 0 ? "hold" : warnings.length > 0 ? "review" : "ready";

  return {
    manuscriptId: manuscript.id,
    registrationId: registration.id,
    status,
    blockers,
    warnings,
    readySignals,
    remediationActions: unique(remediationActions),
    reviewerPacket: buildReviewerPacket(manuscript, registration, status, blockers, warnings, readySignals),
    auditDigest: buildAuditDigest(manuscript.id, registration.id, status, blockers, warnings),
  };
}

function evaluateRegistrationIdentity(registration, manuscript, blockers, warnings, readySignals, remediationActions) {
  if (!registration.id || !registration.registry) {
    blockers.push({
      code: "MISSING_REGISTRATION_RECORD",
      severity: "hold",
      message: "Manuscript review needs a registry and registration identifier.",
    });
    remediationActions.push("Attach the preregistration or registered report identifier before AI peer review.");
    return;
  }

  readySignals.push(`Registration ${registration.registry}:${registration.id} is linked to the manuscript.`);

  if (!registration.registeredAt) {
    warnings.push({
      code: "REGISTRATION_DATE_MISSING",
      severity: "review",
      message: "Registration record lacks a timestamp for checking prospective registration.",
    });
    remediationActions.push("Record the original registration timestamp.");
  }

  if (!manuscript.submittedAt) {
    warnings.push({
      code: "MANUSCRIPT_SUBMISSION_DATE_MISSING",
      severity: "review",
      message: "Manuscript lacks a submission timestamp for registration timing checks.",
    });
  }
}

function evaluateOutcomePlan(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions) {
  const registeredPrimary = normalizeList(registration.primaryOutcomes);
  const manuscriptPrimary = normalizeList(manuscript.primaryOutcomes);
  const registeredSecondary = normalizeList(registration.secondaryOutcomes);
  const manuscriptSecondary = normalizeList(manuscript.secondaryOutcomes);

  if (registeredPrimary.length === 0) {
    blockers.push({
      code: "NO_REGISTERED_PRIMARY_OUTCOME",
      severity: "hold",
      message: "Registration does not declare a primary outcome.",
    });
    remediationActions.push("Add or cite the registered primary outcome before using the AI review packet.");
    return;
  }

  const missingPrimary = registeredPrimary.filter((outcome) => !manuscriptPrimary.includes(outcome));
  const addedPrimary = manuscriptPrimary.filter((outcome) => !registeredPrimary.includes(outcome));

  if (missingPrimary.length > 0 || addedPrimary.length > 0) {
    const amended = hasAmendment(amendments, "primary-outcome");
    const severity = amended ? "review" : "hold";
    const issue = {
      code: amended ? "PRIMARY_OUTCOME_AMENDED" : "PRIMARY_OUTCOME_SWITCH",
      severity,
      message: `Primary outcome mismatch. Missing: ${formatList(missingPrimary)}. Added: ${formatList(addedPrimary)}.`,
    };
    (amended ? warnings : blockers).push(issue);
    remediationActions.push("Explain the primary-outcome change and downgrade unregistered outcomes to exploratory if not prospectively amended.");
  } else {
    readySignals.push("Primary manuscript outcome matches the registered primary outcome plan.");
  }

  const promotedSecondary = manuscriptPrimary.filter((outcome) => registeredSecondary.includes(outcome));
  if (promotedSecondary.length > 0 && !hasAmendment(amendments, "outcome-hierarchy")) {
    blockers.push({
      code: "SECONDARY_OUTCOME_PROMOTED",
      severity: "hold",
      message: `Secondary outcome promoted to primary without amendment: ${promotedSecondary.join(", ")}.`,
    });
    remediationActions.push("Restore the registered outcome hierarchy or cite a prospective amendment.");
  }

  const missingSecondary = registeredSecondary.filter((outcome) => !manuscriptSecondary.includes(outcome) && !manuscriptPrimary.includes(outcome));
  if (missingSecondary.length > 0) {
    warnings.push({
      code: "REGISTERED_SECONDARY_OUTCOME_OMITTED",
      severity: "review",
      message: `Registered secondary outcomes are omitted: ${missingSecondary.join(", ")}.`,
    });
    remediationActions.push("Report omitted secondary outcomes or explain why they are not analyzed.");
  }
}

function evaluateAnalysisPlan(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions) {
  const registeredModel = normalizeToken(registration.analysisPlan?.model);
  const manuscriptModel = normalizeToken(manuscript.analysisPlan?.model);

  if (!registeredModel) {
    warnings.push({
      code: "REGISTERED_MODEL_MISSING",
      severity: "review",
      message: "Registration lacks a declared primary statistical model.",
    });
  } else if (registeredModel !== manuscriptModel) {
    if (hasAmendment(amendments, "analysis-model")) {
      warnings.push({
        code: "ANALYSIS_MODEL_AMENDED",
        severity: "review",
        message: `Analysis model changed from ${registration.analysisPlan.model} to ${manuscript.analysisPlan?.model}.`,
      });
    } else {
      blockers.push({
        code: "ANALYSIS_MODEL_DEVIATION",
        severity: "hold",
        message: `Analysis model changed from ${registration.analysisPlan.model} to ${manuscript.analysisPlan?.model || "not stated"}.`,
      });
      remediationActions.push("Restore the preregistered analysis model or label the changed analysis as exploratory.");
    }
  } else {
    readySignals.push("Primary analysis model matches the registered analysis plan.");
  }

  const registeredCovariates = normalizeList(registration.analysisPlan?.covariates);
  const manuscriptCovariates = normalizeList(manuscript.analysisPlan?.covariates);
  const addedCovariates = manuscriptCovariates.filter((covariate) => !registeredCovariates.includes(covariate));
  if (addedCovariates.length > 0 && !hasAmendment(amendments, "covariates")) {
    warnings.push({
      code: "UNREGISTERED_COVARIATES_ADDED",
      severity: "review",
      message: `Manuscript adds unregistered covariates: ${addedCovariates.join(", ")}.`,
    });
    remediationActions.push("Mark added covariates as sensitivity analyses or cite a prospective amendment.");
  }

  if (manuscript.analysisPlan?.multipleTestingCorrection === false && registration.analysisPlan?.requiresMultipleTestingCorrection) {
    blockers.push({
      code: "MULTIPLE_TESTING_CORRECTION_MISSING",
      severity: "hold",
      message: "Registered plan requires multiple-testing correction but manuscript disables it.",
    });
    remediationActions.push("Apply the registered multiple-testing correction or explain the deviation.");
  }
}

function evaluateSampleAndExclusions(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions) {
  const registeredN = Number(registration.samplePlan?.targetN || 0);
  const manuscriptN = Number(manuscript.samplePlan?.analyzedN || 0);

  if (registeredN > 0 && manuscriptN > 0) {
    const lowerBound = registeredN * 0.9;
    const upperBound = registeredN * 1.1;
    if ((manuscriptN < lowerBound || manuscriptN > upperBound) && !hasAmendment(amendments, "sample-size")) {
      warnings.push({
        code: "SAMPLE_SIZE_DEVIATION",
        severity: "review",
        message: `Analyzed sample size ${manuscriptN} differs from target ${registeredN} by more than 10%.`,
      });
      remediationActions.push("Explain recruitment stopping, attrition, or sample-size amendment.");
    } else {
      readySignals.push("Analyzed sample size is within the registered tolerance or amendment path.");
    }
  }

  const registeredExclusions = normalizeList(registration.samplePlan?.exclusionCriteria);
  const manuscriptExclusions = normalizeList(manuscript.samplePlan?.exclusionCriteria);
  const omittedExclusions = registeredExclusions.filter((criterion) => !manuscriptExclusions.includes(criterion));
  const addedExclusions = manuscriptExclusions.filter((criterion) => !registeredExclusions.includes(criterion));

  if (omittedExclusions.length > 0) {
    blockers.push({
      code: "REGISTERED_EXCLUSION_CRITERIA_OMITTED",
      severity: "hold",
      message: `Registered exclusion criteria are missing from the manuscript: ${omittedExclusions.join(", ")}.`,
    });
    remediationActions.push("Report every registered exclusion criterion and participant count impact.");
  }

  if (addedExclusions.length > 0 && !hasAmendment(amendments, "exclusion-criteria")) {
    blockers.push({
      code: "POST_HOC_EXCLUSION_CRITERIA",
      severity: "hold",
      message: `Manuscript adds exclusion criteria without amendment: ${addedExclusions.join(", ")}.`,
    });
    remediationActions.push("Remove post-hoc exclusions from confirmatory analysis or label them exploratory.");
  }
}

function evaluateExploratoryClaims(registration, manuscript, blockers, warnings, readySignals, remediationActions) {
  const registeredSubgroups = normalizeList(registration.analysisPlan?.subgroups);
  const manuscriptSubgroups = normalizeList(manuscript.analysisPlan?.subgroups);
  const unregisteredSubgroups = manuscriptSubgroups.filter((subgroup) => !registeredSubgroups.includes(subgroup));

  if (unregisteredSubgroups.length > 0 && manuscript.claims?.subgroupsPresentedAsConfirmatory) {
    blockers.push({
      code: "UNREGISTERED_SUBGROUP_CONFIRMATORY_CLAIM",
      severity: "hold",
      message: `Unregistered subgroups are presented as confirmatory: ${unregisteredSubgroups.join(", ")}.`,
    });
    remediationActions.push("Move unregistered subgroup findings to exploratory language.");
  } else if (unregisteredSubgroups.length > 0) {
    warnings.push({
      code: "UNREGISTERED_SUBGROUPS_DISCLOSED",
      severity: "review",
      message: `Unregistered subgroups need clear exploratory labeling: ${unregisteredSubgroups.join(", ")}.`,
    });
  }

  if (manuscript.claims?.exploratoryLabelingComplete) {
    readySignals.push("Exploratory findings are labeled separately from confirmatory tests.");
  } else if ((manuscript.claims?.exploratoryFindings || []).length > 0) {
    warnings.push({
      code: "EXPLORATORY_LABELING_INCOMPLETE",
      severity: "review",
      message: "Exploratory findings are present but labeling is incomplete.",
    });
    remediationActions.push("Add explicit exploratory labels to non-preregistered findings.");
  }
}

function evaluateTimeline(registration, manuscript, amendments, blockers, warnings, readySignals, remediationActions) {
  const registeredAt = parseDate(registration.registeredAt);
  const dataCollectionStartedAt = parseDate(manuscript.dataCollectionStartedAt || registration.dataCollectionStartedAt);

  if (registeredAt && dataCollectionStartedAt && registeredAt > dataCollectionStartedAt) {
    blockers.push({
      code: "RETROSPECTIVE_REGISTRATION",
      severity: "hold",
      message: "Registration timestamp is after data collection started.",
    });
    remediationActions.push("Disclose retrospective registration and avoid confirmatory preregistration claims.");
  }

  for (const amendment of amendments) {
    const amendedAt = parseDate(amendment.date);
    if (amendedAt && manuscript.unblindedAt && amendedAt > parseDate(manuscript.unblindedAt)) {
      warnings.push({
        code: "POST_UNBLINDING_AMENDMENT",
        severity: "review",
        message: `Amendment ${amendment.id || amendment.type} occurred after unblinding.`,
      });
      remediationActions.push("Explain whether post-unblinding amendments affect confirmatory claims.");
    }
  }

  if (registeredAt && dataCollectionStartedAt && registeredAt <= dataCollectionStartedAt) {
    readySignals.push("Registration predates data collection start.");
  }
}

function buildReviewerPacket(manuscript, registration, status, blockers, warnings, readySignals) {
  return {
    manuscriptTitle: manuscript.title,
    registration: `${registration.registry || "registry"}:${registration.id || "missing"}`,
    status,
    requiredDecision: status === "hold" ? "hold_confirmatory_review" : status === "review" ? "deviation_review" : "release_ai_review",
    blockerCodes: blockers.map((blocker) => blocker.code),
    warningCodes: warnings.map((warning) => warning.code),
    readySignals,
  };
}

function buildAuditDigest(manuscriptId, registrationId, status, blockers, warnings) {
  const blockerCodes = blockers.map((blocker) => blocker.code).sort().join("|") || "none";
  const warningCodes = warnings.map((warning) => warning.code).sort().join("|") || "none";
  return `${manuscriptId || "manuscript"}:${registrationId || "registration"}:${status}:B=${blockerCodes}:W=${warningCodes}`;
}

function hasAmendment(amendments, type) {
  return amendments.some((amendment) => normalizeToken(amendment.type) === normalizeToken(type) && amendment.prospective !== false);
}

function normalizeList(values) {
  return (values || []).map(normalizeToken).filter(Boolean);
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[^\w./-]+/g, "-").replace(/^-|-$/g, "");
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatList(values) {
  return values.length > 0 ? values.join(", ") : "none";
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  evaluatePreregistrationDeviation,
};
