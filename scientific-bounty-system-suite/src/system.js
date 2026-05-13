import { demoChallenge, demoSubmission } from "./demo-data.js";

const VERTICAL_TEMPLATES = {
  biotech: {
    requiredContext: ["cohorts", "assay", "ethics", "validation plan"],
    requiredDeliverables: ["model", "notebook", "dataset", "whitepaper"],
  },
  materials: {
    requiredContext: ["composition", "measurement protocol", "baseline"],
    requiredDeliverables: ["model", "dataset", "whitepaper"],
  },
  climate: {
    requiredContext: ["region", "forecast horizon", "baseline model"],
    requiredDeliverables: ["model", "notebook", "dataset"],
  },
  ml: {
    requiredContext: ["task", "benchmark", "evaluation metric"],
    requiredDeliverables: ["model", "notebook", "demo"],
  },
  chemistry: {
    requiredContext: ["compound class", "assay", "safety constraints"],
    requiredDeliverables: ["dataset", "whitepaper", "notebook"],
  },
};

function issue(id, severity, area, message, recommendation, evidence = []) {
  return { id, severity, area, message, recommendation, evidence };
}

function scoreIssues(issues) {
  const penalty = issues.reduce((total, item) => {
    if (item.severity === "blocker") return total + 25;
    if (item.severity === "warning") return total + 10;
    return total + 3;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function resolveIpPolicy(challenge = demoChallenge) {
  const policies = {
    "solver-retained": {
      title: "Solver retains IP until optional license",
      transferTrigger: "separate license agreement",
      solverRights: "full ownership before and after prize unless separately licensed",
      sponsorRights: "evaluation access only",
    },
    "sponsored-transfer": {
      title: "Sponsored IP transfer upon verified payout",
      transferTrigger: "final award payout confirmation",
      solverRights: "ownership retained until paid",
      sponsorRights: "exclusive commercial rights after payout",
    },
    "open-license": {
      title: "Open submission under predefined license",
      transferTrigger: "public submission acceptance",
      solverRights: "attribution and open license rights",
      sponsorRights: "same open license rights as public users",
    },
  };

  return policies[challenge.ipPolicy] ?? policies["solver-retained"];
}

export function buildChallengePortal(challenge = demoChallenge) {
  const template = VERTICAL_TEMPLATES[challenge.vertical] ?? VERTICAL_TEMPLATES.ml;
  const issues = [];
  const deliverableIds = new Set(challenge.deliverables.map((item) => item.id));

  if (!challenge.problem?.description || !challenge.problem?.scientificContext) {
    issues.push(
      issue(
        "missing-problem-context",
        "blocker",
        "challenge posting",
        "Problem description or scientific context is missing.",
        "Add both public problem framing and scientific background before publishing.",
      ),
    );
  }

  for (const required of template.requiredDeliverables) {
    if (!deliverableIds.has(required)) {
      issues.push(
        issue(
          `missing-${required}`,
          "blocker",
          "deliverables",
          `Required ${required} deliverable is missing for ${challenge.vertical}.`,
          `Add a required ${required} deliverable to the challenge package.`,
        ),
      );
    }
  }

  const rubricTotal = challenge.rubric.reduce((total, item) => total + item.maxScore, 0);
  if (rubricTotal !== 100) {
    issues.push(
      issue(
        "rubric-not-100",
        "warning",
        "evaluation rubric",
        `Rubric totals ${rubricTotal}, not 100.`,
        "Normalize rubric weights to 100 points for consistent judging.",
      ),
    );
  }

  const timelinePercent = challenge.timeline.reduce((total, phase) => total + phase.prizePercent, 0);
  if (timelinePercent !== 100) {
    issues.push(
      issue(
        "payout-schedule-not-100",
        "warning",
        "payout schedule",
        `Milestone payout schedule totals ${timelinePercent}%.`,
        "Normalize proposal, prototype, and final prize percentages to 100.",
      ),
    );
  }

  if (challenge.sponsor?.escrowStatus !== "funded") {
    issues.push(
      issue(
        "escrow-not-funded",
        "blocker",
        "reward trust",
        "Prize escrow is not funded.",
        "Fund escrow before accepting submissions.",
      ),
    );
  }

  return {
    challengeId: challenge.id,
    title: challenge.title,
    vertical: challenge.vertical,
    template,
    readinessScore: scoreIssues(issues),
    status: issues.some((item) => item.severity === "blocker") ? "needs-fixes" : "publishable",
    issues,
    posting: {
      visibility: challenge.visibility,
      ndaRequired: challenge.ndaRequired,
      preQualification: challenge.preQualification,
      deliverables: challenge.deliverables,
      rubric: challenge.rubric,
      timeline: challenge.timeline,
      prize: challenge.prize,
      ipPolicy: resolveIpPolicy(challenge),
    },
  };
}

export function buildSubmissionPackage(
  challenge = demoChallenge,
  submission = demoSubmission,
) {
  const requiredDeliverables = challenge.deliverables
    .filter((item) => item.required)
    .map((item) => item.id);
  const artifactMap = new Map(submission.artifacts.map((artifact) => [artifact.id, artifact]));
  const findings = [];

  for (const deliverable of requiredDeliverables) {
    const artifact = artifactMap.get(deliverable);
    if (!artifact) {
      findings.push(
        issue(
          `missing-artifact-${deliverable}`,
          "blocker",
          "submission manifest",
          `Required deliverable ${deliverable} is missing from the package.`,
          "Upload the missing artifact before final submission.",
        ),
      );
    } else if (!artifact.complete || !artifact.checksum) {
      findings.push(
        issue(
          `incomplete-artifact-${deliverable}`,
          "blocker",
          "submission manifest",
          `${deliverable} is incomplete or lacks checksum evidence.`,
          "Mark the artifact complete and attach a checksum.",
          [artifact.id],
        ),
      );
    }
  }

  if (!submission.workspace?.versionControl || submission.auditLog.length < 2) {
    findings.push(
      issue(
        "weak-audit-trail",
        "warning",
        "private workspace",
        "Version control or audit log evidence is too thin.",
        "Require version control and at least two audit events before sponsor review.",
      ),
    );
  }

  const totalShare = submission.team.reduce((total, member) => total + member.payoutShare, 0);
  if (totalShare !== 100) {
    findings.push(
      issue(
        "payout-share-mismatch",
        "blocker",
        "team payout routing",
        `Team payout shares total ${totalShare}%.`,
        "Normalize team payout shares to 100 before award routing.",
      ),
    );
  }

  return {
    submissionId: submission.id,
    challengeId: challenge.id,
    participationMode: submission.participationMode,
    currentPhase: submission.currentPhase,
    packageScore: scoreIssues(findings),
    status: findings.some((item) => item.severity === "blocker") ? "blocked" : "ready-for-review",
    findings,
    manifest: submission.artifacts.map((artifact) => ({
      artifactId: artifact.id,
      type: artifact.type,
      version: artifact.version,
      checksum: artifact.checksum,
      complete: artifact.complete,
    })),
    accessPolicy: submission.workspace,
    auditLog: submission.auditLog,
  };
}

export function buildArbitrationWorkflow(
  challenge = demoChallenge,
  submission = demoSubmission,
) {
  const packageReport = buildSubmissionPackage(challenge, submission);
  const scoresByRubric = new Map();
  for (const rubric of challenge.rubric) scoresByRubric.set(rubric.id, []);
  for (const score of submission.reviewerScores) {
    if (scoresByRubric.has(score.rubricId)) scoresByRubric.get(score.rubricId).push(score.score);
  }

  const checklist = challenge.deliverables.map((deliverable) => ({
    deliverableId: deliverable.id,
    title: deliverable.title,
    required: deliverable.required,
    received: packageReport.manifest.some((artifact) => artifact.artifactId === deliverable.id),
  }));

  const rubricResults = challenge.rubric.map((rubric) => {
    const scores = scoresByRubric.get(rubric.id) ?? [];
    const average =
      scores.length === 0 ? 0 : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    return {
      rubricId: rubric.id,
      title: rubric.title,
      maxScore: rubric.maxScore,
      average,
      covered: scores.length > 0,
    };
  });

  const missingRubricReviews = rubricResults.filter((result) => !result.covered);
  const totalScore = rubricResults.reduce((total, result) => total + result.average, 0);
  const riskFlags = [
    ...packageReport.findings,
    ...missingRubricReviews.map((result) =>
      issue(
        `missing-review-${result.rubricId}`,
        "warning",
        "review coverage",
        `${result.title} has no reviewer score.`,
        "Assign at least one reviewer for every rubric category.",
      ),
    ),
    ...submission.feedback.filter((item) => item.severity === "warning").map((item, index) =>
      issue(
        `feedback-warning-${index + 1}`,
        "warning",
        "feedback loop",
        item.message,
        "Resolve or explicitly accept this reviewer warning before final award.",
      ),
    ),
  ];

  return {
    submissionId: submission.id,
    challengeId: challenge.id,
    checklist,
    reviewers: [...new Set(submission.reviewerScores.map((score) => score.reviewer))],
    rubricResults,
    totalScore,
    riskFlags,
    feedbackLoop: {
      status: riskFlags.some((item) => item.severity === "blocker") ? "sponsor-action-required" : "open",
      messages: submission.feedback,
    },
    awardRecommendation:
      packageReport.status === "ready-for-review" && totalScore >= 80 ? "award-final-milestone" : "hold-award",
  };
}

export function buildPayoutPlan(challenge = demoChallenge, submission = demoSubmission) {
  const arbitration = buildArbitrationWorkflow(challenge, submission);
  const finalMilestone = challenge.timeline.find((phase) => phase.phase === "final");
  const finalPool = Math.round((challenge.prize.total * (finalMilestone?.prizePercent ?? 0)) / 100);
  const teamRoutes = submission.team.map((member) => ({
    solverId: member.id,
    role: member.role,
    institution: member.institution,
    sharePercent: member.payoutShare,
    amount: Math.round((finalPool * member.payoutShare) / 100),
  }));

  return {
    challengeId: challenge.id,
    submissionId: submission.id,
    currency: challenge.prize.currency,
    escrowStatus: challenge.sponsor.escrowStatus,
    awardRecommendation: arbitration.awardRecommendation,
    milestone: {
      phase: "final",
      pool: finalPool,
      percent: finalMilestone?.prizePercent ?? 0,
    },
    teamRoutes,
    honorableMentionPool: challenge.prize.honorableMentionPool,
    ipPolicy: resolveIpPolicy(challenge),
    payoutStatus:
      challenge.sponsor.escrowStatus === "funded" && arbitration.awardRecommendation === "award-final-milestone"
        ? "ready-for-sponsor-approval"
        : "not-ready",
  };
}

export function buildDashboard(challenge = demoChallenge, submission = demoSubmission) {
  return {
    generatedAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
    challenge: buildChallengePortal(challenge),
    submission: buildSubmissionPackage(challenge, submission),
    arbitration: buildArbitrationWorkflow(challenge, submission),
    payouts: buildPayoutPlan(challenge, submission),
  };
}
