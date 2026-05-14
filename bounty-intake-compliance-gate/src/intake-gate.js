import crypto from "node:crypto";

const ALLOWED_VERTICALS = new Set(["biotech", "materials", "climate", "ml", "chemistry", "quantum"]);
const ALLOWED_VISIBILITY = new Set(["public", "private", "invite-only"]);
const REQUIRED_PROBLEM_FIELDS = ["summary", "scientificContext", "targetOutcome"];
const REQUIRED_DELIVERABLE_TYPES = new Set(["notebook", "dataset", "whitepaper", "model", "report", "code"]);

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function hashEvidence(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12)}`;
}

export function sum(numbers) {
  return numbers.reduce((total, value) => total + value, 0);
}

export function validateChallenge(challenge) {
  const findings = [];

  if (!challenge.sponsor?.verified) {
    findings.push(blocker("sponsor-unverified", "Sponsor must be verified before publishing a challenge."));
  }
  if (!challenge.sponsor?.billingReady) {
    findings.push(warning("sponsor-billing-not-ready", "Sponsor billing profile is not ready for prize escrow or invoicing."));
  }
  if (!ALLOWED_VERTICALS.has(challenge.vertical)) {
    findings.push(blocker("unsupported-vertical", `Unsupported R&D vertical: ${challenge.vertical}`));
  }
  if (!ALLOWED_VISIBILITY.has(challenge.visibility)) {
    findings.push(blocker("unsupported-visibility", `Unsupported visibility: ${challenge.visibility}`));
  }

  for (const field of REQUIRED_PROBLEM_FIELDS) {
    if (!challenge.problem?.[field]?.trim()) {
      findings.push(blocker(`missing-problem-${field}`, `Problem field '${field}' is required.`));
    }
  }

  const requiredDeliverables = challenge.deliverables.filter((deliverable) => deliverable.required);
  if (requiredDeliverables.length < 2) {
    findings.push(blocker("insufficient-deliverables", "At least two required deliverables are needed for scientific review."));
  }
  for (const deliverable of challenge.deliverables) {
    if (!REQUIRED_DELIVERABLE_TYPES.has(deliverable.type)) {
      findings.push(warning("unusual-deliverable-type", `Deliverable ${deliverable.id} has non-standard type ${deliverable.type}.`));
    }
  }

  const rubricWeight = sum(challenge.rubric.map((item) => item.weight));
  if (rubricWeight !== 100) {
    findings.push(blocker("rubric-weight-total", `Rubric weights must total 100, currently ${rubricWeight}.`));
  }
  if (challenge.rubric.length < 3) {
    findings.push(warning("rubric-too-thin", "A stronger scientific challenge should use at least three rubric criteria."));
  }

  const milestonePayout = sum(challenge.milestones.map((item) => item.payoutPercent));
  if (milestonePayout !== 100) {
    findings.push(blocker("milestone-payout-total", `Milestone payout percentages must total 100, currently ${milestonePayout}.`));
  }
  if (!challenge.milestones.some((item) => item.id === "final")) {
    findings.push(blocker("missing-final-milestone", "A final milestone is required."));
  }

  if (challenge.prize.escrowRequired && challenge.prize.escrowStatus !== "funded") {
    findings.push(blocker("escrow-not-funded", "Escrow-required challenges cannot publish until funds are available."));
  }
  if (challenge.prize.totalCents <= 0) {
    findings.push(blocker("missing-prize", "Prize amount must be greater than zero."));
  }

  if (challenge.nda.required && !challenge.nda.templateId) {
    findings.push(blocker("missing-nda-template", "NDA-required challenges need a template id."));
  }
  if (challenge.nda.dataRoomRequired && challenge.visibility === "public") {
    findings.push(warning("public-sensitive-data", "Public visibility with data-room requirements should be reviewed."));
  }

  if (challenge.prequalification.enabled) {
    const requiredSignals = new Set(challenge.prequalification.requiredSignals);
    for (const signal of ["orcid", "conflict-disclosure"]) {
      if (!requiredSignals.has(signal)) {
        findings.push(warning("prequalification-signal-gap", `Prequalification should require ${signal}.`));
      }
    }
    if (!challenge.prequalification.maxTeams || challenge.prequalification.maxTeams < 1) {
      findings.push(blocker("invalid-prequalification-team-limit", "Prequalification needs a positive maxTeams limit."));
    }
  }

  if (!challenge.ipPolicy.solverRetainsIpUntilPaid) {
    findings.push(blocker("ip-before-payout-risk", "Solver IP must remain protected until payout is complete."));
  }
  if (challenge.ipPolicy.mode === "open" && challenge.ipPolicy.openSourceAfterEmbargoDays === null) {
    findings.push(warning("open-policy-without-embargo", "Open IP policy should state immediate release or embargo days."));
  }

  const opensAt = new Date(challenge.timeline.opensAt);
  const closesAt = new Date(challenge.timeline.closesAt);
  if (!(closesAt > opensAt)) {
    findings.push(blocker("invalid-timeline", "Challenge close time must be after open time."));
  }

  return {
    challengeId: challenge.id,
    valid: !findings.some((finding) => finding.severity === "blocker"),
    status: findings.some((finding) => finding.severity === "blocker")
      ? "hold"
      : findings.length
        ? "needs-review"
        : "publish-ready",
    findings,
    evidenceHash: hashEvidence({ id: challenge.id, findings }),
  };
}

export function buildPublishDecision(challenge) {
  const validation = validateChallenge(challenge);
  const publishChecklist = [
    checklistItem("sponsor verified", challenge.sponsor.verified),
    checklistItem("billing or escrow ready", challenge.sponsor.billingReady || challenge.prize.escrowStatus === "funded"),
    checklistItem("problem statement complete", REQUIRED_PROBLEM_FIELDS.every((field) => Boolean(challenge.problem[field]?.trim()))),
    checklistItem("rubric sums to 100", sum(challenge.rubric.map((item) => item.weight)) === 100),
    checklistItem("milestone payouts sum to 100", sum(challenge.milestones.map((item) => item.payoutPercent)) === 100),
    checklistItem("IP protected until payout", challenge.ipPolicy.solverRetainsIpUntilPaid),
  ];

  return {
    challengeId: challenge.id,
    title: challenge.title,
    decision: validation.valid ? "publish" : "hold",
    status: validation.status,
    publishChecklist,
    blockerCount: validation.findings.filter((finding) => finding.severity === "blocker").length,
    warningCount: validation.findings.filter((finding) => finding.severity === "warning").length,
    findings: validation.findings,
    evidenceHash: validation.evidenceHash,
  };
}

export function scoreParticipantApplication(challenge, application) {
  if (application.challengeId !== challenge.id) {
    throw new Error(`Application ${application.id} does not belong to challenge ${challenge.id}`);
  }

  if (!challenge.prequalification.enabled) {
    return {
      applicationId: application.id,
      challengeId: challenge.id,
      eligible: true,
      score: 100,
      reasons: ["prequalification-disabled"],
      requiredActions: [],
    };
  }

  const requiredActions = [];
  let score = 0;

  if (application.signals.orcid) score += 20;
  else requiredActions.push("connect-orcid");

  if (application.signals.institution) score += 15;
  else requiredActions.push("verify-institution");

  if (application.signals.conflictDisclosure) score += 20;
  else requiredActions.push("submit-conflict-disclosure");

  if (!challenge.nda.required || application.signals.ndaSigned) score += 20;
  else requiredActions.push("sign-nda");

  const domainExperience = application.signals.domainExperience ?? [];
  const domainScore = Math.min(20, domainExperience.length * 7);
  score += domainScore;

  if ((application.signals.priorBountyCompletions ?? 0) > 0) {
    score += 5;
  }

  return {
    applicationId: application.id,
    challengeId: challenge.id,
    teamName: application.teamName,
    eligible: score >= 75 && requiredActions.length === 0,
    score,
    reasons: [
      application.signals.orcid ? "orcid-linked" : null,
      application.signals.institution ? "institution-verified" : null,
      application.signals.conflictDisclosure ? "conflict-disclosed" : null,
      application.signals.ndaSigned ? "nda-signed" : null,
      domainExperience.length ? `domain-signals:${domainExperience.join(",")}` : null,
    ].filter(Boolean),
    requiredActions,
  };
}

export function buildChallengeDashboard(challenges, applications = []) {
  const decisions = challenges.map(buildPublishDecision);
  const applicationScores = applications.map((application) => {
    const challenge = challenges.find((item) => item.id === application.challengeId);
    return scoreParticipantApplication(challenge, application);
  });

  return {
    totalChallenges: challenges.length,
    publishReady: decisions.filter((decision) => decision.decision === "publish").length,
    holds: decisions.filter((decision) => decision.decision === "hold"),
    decisions,
    applicationScores,
    verticals: [...new Set(challenges.map((challenge) => challenge.vertical))].sort(),
  };
}

export function buildSponsorAuditPacket(challenge, applications = []) {
  const decision = buildPublishDecision(challenge);
  const relevantApplications = applications.filter((application) => application.challengeId === challenge.id);

  return {
    packetVersion: "bounty-intake-compliance-gate/v0.1",
    challengeId: challenge.id,
    exportedAt: "2026-05-15T01:35:00.000Z",
    challengeHash: hashEvidence(challenge),
    publishDecision: decision,
    prequalification: {
      enabled: challenge.prequalification.enabled,
      maxTeams: challenge.prequalification.maxTeams,
      blindReview: challenge.prequalification.blindReview,
      applications: relevantApplications.map((application) => scoreParticipantApplication(challenge, application)),
    },
    sponsorAssurances: {
      verified: challenge.sponsor.verified,
      billingReady: challenge.sponsor.billingReady,
      escrowStatus: challenge.prize.escrowStatus,
      ndaTemplateId: challenge.nda.templateId,
      ipMode: challenge.ipPolicy.mode,
      solverRetainsIpUntilPaid: challenge.ipPolicy.solverRetainsIpUntilPaid,
    },
    evidenceHash: hashEvidence({ decision, applicationIds: relevantApplications.map((item) => item.id) }),
  };
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function warning(code, message) {
  return { severity: "warning", code, message };
}

function checklistItem(label, passed) {
  return { label, passed: Boolean(passed) };
}
