"use strict";

const crypto = require("node:crypto");

const HARD_CONFLICT_TYPES = new Set([
  "author-self",
  "current-institution",
  "recent-collaboration",
  "recent-coauthor",
  "financial-interest",
]);

const SEVERITY_WEIGHT = {
  low: 5,
  medium: 18,
  high: 100,
};

function ensureBundle(bundle) {
  for (const field of ["project", "reviewers"]) {
    if (!bundle || !bundle[field]) {
      throw new Error(`missing required bundle field: ${field}`);
    }
  }
  if (!Array.isArray(bundle.reviewers) || bundle.reviewers.length === 0) {
    throw new Error("reviewers must include at least one candidate");
  }
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function tokenize(value) {
  return list(value)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function overlapScore(left, right) {
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const token of a) {
    if (b.has(token)) {
      shared += 1;
    }
  }
  return round(shared / Math.max(a.size, b.size));
}

function disclosureReasons(reviewer, disclosures) {
  return list(disclosures)
    .filter((item) => item.reviewerId === reviewer.id)
    .map((item) => ({
      code: item.type,
      severity: item.severity || "medium",
      message: item.summary || `${item.type} disclosure`,
      source: "self-disclosure",
    }));
}

function detectConflicts(project, reviewer, disclosures = []) {
  const reasons = disclosureReasons(reviewer, disclosures);
  const authorIds = new Set(list(project.authorIds));
  const authorInstitutions = new Set(list(project.authorInstitutions).map((item) => item.toLowerCase()));
  const reviewerInstitution = String(reviewer.institution || "").toLowerCase();

  if (authorIds.has(reviewer.id)) {
    reasons.push({
      code: "author-self",
      severity: "high",
      message: "Reviewer is also listed as a project author.",
      source: "platform-record",
    });
  }

  if (reviewerInstitution && authorInstitutions.has(reviewerInstitution)) {
    reasons.push({
      code: "current-institution",
      severity: "high",
      message: "Reviewer shares an institution with a project author.",
      source: "platform-record",
    });
  }

  const collaborators = new Set(list(reviewer.recentCollaboratorIds));
  const coauthors = new Set(list(reviewer.recentCoauthorIds));
  for (const authorId of authorIds) {
    if (collaborators.has(authorId)) {
      reasons.push({
        code: "recent-collaboration",
        severity: "high",
        message: "Reviewer has a recent collaboration with a project author.",
        source: "platform-record",
      });
    }
    if (coauthors.has(authorId)) {
      reasons.push({
        code: "recent-coauthor",
        severity: "high",
        message: "Reviewer has a recent coauthorship with a project author.",
        source: "platform-record",
      });
    }
  }

  const projectFunders = new Set(list(project.funders).map((item) => item.toLowerCase()));
  const sharedFunders = list(reviewer.funders).filter((item) => projectFunders.has(String(item).toLowerCase()));
  if (sharedFunders.length > 0) {
    reasons.push({
      code: "shared-funder",
      severity: "medium",
      message: `Reviewer shares project funder: ${sharedFunders.join(", ")}.`,
      source: "platform-record",
    });
  }

  const dedupedReasons = [];
  const seenCodes = new Set();
  for (const reason of reasons) {
    if (!seenCodes.has(reason.code)) {
      dedupedReasons.push(reason);
      seenCodes.add(reason.code);
    }
  }

  const hardBlocked = dedupedReasons.some((reason) => {
    return reason.severity === "high" && HARD_CONFLICT_TYPES.has(reason.code);
  });

  return {
    hardBlocked,
    reasons: dedupedReasons,
    penalty: dedupedReasons.reduce((total, reason) => total + (SEVERITY_WEIGHT[reason.severity] || 10), 0),
  };
}

function trustScore(profile = {}) {
  const completed = Math.min(30, Number(profile.completedReviews || 0) * 0.7);
  const endorsement = Math.min(20, Number(profile.endorsementScore || 0) * 0.2);
  const reproducibility = Math.min(25, Number(profile.reproducibilityScore || 0) * 0.25);
  const turnaround = Math.max(0, 15 - Number(profile.medianTurnaroundDays || 14));
  const training = profile.blindReviewTraining ? 7 : 0;
  const disputePenalty = Math.min(20, Number(profile.disputeRate || 0) * 100);
  const overduePenalty = Math.min(12, Number(profile.overdueReviews || 0) * 4);
  const driftPenalty = Math.min(12, Number(profile.consensusDrift || 0) * 60);

  return Math.max(0, round(completed + endorsement + reproducibility + turnaround + training - disputePenalty - overduePenalty - driftPenalty));
}

function expertiseScore(project, reviewer) {
  const discipline = String(project.discipline || "").toLowerCase() === String(reviewer.discipline || "").toLowerCase() ? 20 : 8;
  const topic = overlapScore(project.priorityTopics, reviewer.topics) * 42;
  const method = overlapScore(project.methods, reviewer.methods) * 30;
  const artifact = overlapScore(project.artifactScopes, reviewer.methods.concat(reviewer.topics || [])) * 8;
  return round(Math.min(100, discipline + topic + method + artifact));
}

function workloadScore(reviewer) {
  const active = Number(reviewer.activeAssignments || 0);
  const overdue = Number((reviewer.profile && reviewer.profile.overdueReviews) || 0);
  return Math.max(0, 100 - active * 12 - overdue * 10);
}

function evaluateReviewer(project, reviewer, disclosures = []) {
  const conflicts = detectConflicts(project, reviewer, disclosures);
  const expertise = expertiseScore(project, reviewer);
  const trust = trustScore(reviewer.profile || {});
  const workload = workloadScore(reviewer);
  const qualityRisk = Number((reviewer.profile && reviewer.profile.disputeRate) || 0) >= 0.15;

  let rawScore = expertise * 0.45 + trust * 0.35 + workload * 0.2;
  rawScore -= conflicts.hardBlocked ? 1000 : conflicts.penalty;
  rawScore = round(Math.max(0, Math.min(100, rawScore)));

  let status = "eligible";
  if (conflicts.hardBlocked) {
    status = "blocked";
  } else if (qualityRisk || rawScore < 55 || conflicts.reasons.some((reason) => reason.severity === "medium")) {
    status = "conditional";
  }

  return {
    reviewerId: reviewer.id,
    blindLabel: "",
    status,
    score: rawScore,
    components: {
      expertise,
      trust,
      workload,
      conflictPenalty: conflicts.hardBlocked ? "hard-block" : conflicts.penalty,
    },
    conflictReasons: conflicts.reasons,
    coverage: {
      topics: list(reviewer.topics).filter((topic) => overlapScore([topic], project.priorityTopics) > 0),
      methods: list(reviewer.methods).filter((method) => overlapScore([method], project.methods) > 0),
    },
  };
}

function coversToken(reviewer, token) {
  const haystack = tokenize(list(reviewer.topics).concat(list(reviewer.methods)));
  const needles = tokenize([token]);
  return needles.some((needle) => haystack.includes(needle));
}

function selectedCoverage(project, reviewersById, selectedIds) {
  const covered = [];
  const missing = [];

  for (const topic of list(project.priorityTopics)) {
    const isCovered = selectedIds.some((id) => coversToken(reviewersById.get(id), topic));
    if (isCovered) {
      covered.push(topic);
    } else {
      missing.push(topic);
    }
  }

  return { covered, missing };
}

function buildAssignmentSlate(project, reviewers, disclosures = []) {
  const reviewersById = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer]));
  const scorecards = reviewers
    .map((reviewer) => evaluateReviewer(project, reviewer, disclosures))
    .sort((a, b) => b.score - a.score || a.reviewerId.localeCompare(b.reviewerId));

  const required = Number(project.requiredReviewers || 3);
  const selected = [];
  const selectedInstitutions = new Set();

  for (const card of scorecards.filter((item) => item.status === "eligible")) {
    const reviewer = reviewersById.get(card.reviewerId);
    const institution = String(reviewer.institution || "").toLowerCase();
    const wouldDuplicateInstitution = institution && selectedInstitutions.has(institution);
    const remainingDistinct = scorecards.some((candidate) => {
      const candidateReviewer = reviewersById.get(candidate.reviewerId);
      return (
        candidate.status === "eligible" &&
        !selected.includes(candidate.reviewerId) &&
        String(candidateReviewer.institution || "").toLowerCase() !== institution
      );
    });

    if (wouldDuplicateInstitution && remainingDistinct) {
      continue;
    }

    selected.push(card.reviewerId);
    if (institution) {
      selectedInstitutions.add(institution);
    }
    if (selected.length === required) {
      break;
    }
  }

  if (selected.length < required) {
    for (const card of scorecards.filter((item) => item.status === "conditional")) {
      if (!selected.includes(card.reviewerId)) {
        selected.push(card.reviewerId);
      }
      if (selected.length === required) {
        break;
      }
    }
  }

  const selectedSet = new Set(selected);
  const alternates = scorecards
    .filter((card) => card.status !== "blocked" && !selectedSet.has(card.reviewerId))
    .slice(0, 3)
    .map((card) => card.reviewerId);

  const coverage = selectedCoverage(project, reviewersById, selected);
  const selectedCards = selected.map((id, index) => ({
    ...scorecards.find((card) => card.reviewerId === id),
    blindLabel: `Reviewer ${String.fromCharCode(65 + index)}`,
  }));
  const alternateCards = alternates.map((id, index) => ({
    ...scorecards.find((card) => card.reviewerId === id),
    blindLabel: `Alternate ${index + 1}`,
  }));
  const blockedCards = scorecards.filter((card) => card.status === "blocked");

  let decision = "ready-for-invitation";
  if (selected.length < required || coverage.missing.length > 1) {
    decision = "needs-review-chair";
  } else if (selectedCards.some((card) => card.status === "conditional") || coverage.missing.length === 1) {
    decision = "chair-review-recommended";
  }

  return {
    decision,
    requiredReviewers: required,
    selectedReviewers: selectedCards,
    alternates: alternateCards,
    blockedReviewers: blockedCards,
    coverage,
    scorecards,
  };
}

function chairChecklist(project, slate) {
  const items = [];

  if (project.reviewMode && project.reviewMode.includes("blind")) {
    items.push({
      id: "blind-safety",
      status: slate.blockedReviewers.length > 0 ? "attention" : "pass",
      message: "Confirm blocked reviewers stay hidden from author-facing assignment logs.",
    });
  }

  if (slate.coverage.missing.length > 0) {
    items.push({
      id: "coverage-gap",
      status: "attention",
      message: `Add specialist coverage for: ${slate.coverage.missing.join(", ")}.`,
    });
  }

  const conditional = slate.selectedReviewers.filter((card) => card.status === "conditional");
  if (conditional.length > 0) {
    items.push({
      id: "conditional-reviewer",
      status: "attention",
      message: `Chair approval required for ${conditional.map((card) => card.blindLabel).join(", ")}.`,
    });
  }

  items.push({
    id: "credit-trace",
    status: "pass",
    message: "Assignment packet records reviewer trust signals without exposing author identities.",
  });

  return items;
}

function auditDigest(value) {
  const normalized = stableStringify(value);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function analyzeReviewAssignmentGovernance(bundle) {
  ensureBundle(bundle);
  const project = bundle.project;
  const slate = buildAssignmentSlate(project, bundle.reviewers, bundle.disclosures || []);
  const audit = {
    projectId: project.id,
    reviewMode: project.reviewMode || "public",
    decision: slate.decision,
    selected: slate.selectedReviewers.map((card) => ({
      reviewerId: card.reviewerId,
      blindLabel: card.blindLabel,
      score: card.score,
      status: card.status,
    })),
    blocked: slate.blockedReviewers.map((card) => ({
      reviewerId: card.reviewerId,
      reasons: card.conflictReasons.map((reason) => reason.code),
    })),
    missingCoverage: slate.coverage.missing,
  };

  return {
    module: "peer-review-assignment-governance",
    projectId: project.id,
    reviewMode: project.reviewMode || "public",
    assignmentDecision: slate.decision,
    selectedReviewers: slate.selectedReviewers,
    alternates: slate.alternates,
    blockedReviewers: slate.blockedReviewers,
    coverage: slate.coverage,
    chairChecklist: chairChecklist(project, slate),
    scorecards: slate.scorecards,
    auditDigest: auditDigest(audit),
  };
}

module.exports = {
  analyzeReviewAssignmentGovernance,
  buildAssignmentSlate,
  detectConflicts,
  evaluateReviewer,
  expertiseScore,
  overlapScore,
  trustScore,
  workloadScore,
};
