const CHALLENGE_VERTICALS = ["biotech", "materials", "climate", "ml", "chemistry"];
const VISIBILITIES = ["public", "private"];
const PARTICIPATION_MODES = ["named", "anonymous"];
const IP_MODES = ["default", "sponsored", "open"];
const RECIPIENT_TYPES = ["individual", "team", "institution"];
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export const CHALLENGE_TEMPLATES = Object.freeze(
  Object.fromEntries(
    CHALLENGE_VERTICALS.map((vertical) => [
      vertical,
      Object.freeze({
        vertical,
        requiredSections: Object.freeze([
          "scientificContext",
          "deliverables",
          "rubric",
          "phases",
          "prize",
          "payoutSchedule"
        ])
      })
    ])
  )
);

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function requireIsoDate(value, label) {
  const candidate = requireText(value, label);
  if (Number.isNaN(Date.parse(candidate))) {
    throw new Error(`${label} must be an ISO-compatible date`);
  }
  return candidate;
}

function requireSha256(value, label) {
  const candidate = requireText(value, label).toLowerCase();
  if (!SHA256_PATTERN.test(candidate)) {
    throw new Error(`${label} must be a 64-character hexadecimal SHA-256`);
  }
  return candidate;
}

function requireChoice(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

function requirePositiveAmount(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must contain at least one item`);
  }
  return value;
}

function total(values) {
  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(8));
}

function copy(value) {
  return structuredClone(value);
}

function validateUniqueIds(items, label) {
  const ids = items.map((item, index) => requireText(item.id, `${label}[${index}].id`));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} ids must be unique`);
  }
  return ids;
}

function validateChallengeInput(input) {
  const deliverables = requireArray(input.deliverables, "deliverables").map((item, index) => ({
    id: requireText(item.id, `deliverables[${index}].id`),
    description: requireText(item.description, `deliverables[${index}].description`)
  }));
  validateUniqueIds(deliverables, "deliverables");

  const rubric = requireArray(input.rubric, "rubric").map((item, index) => ({
    id: requireText(item.id, `rubric[${index}].id`),
    description: requireText(item.description, `rubric[${index}].description`),
    weight: requirePositiveAmount(item.weight, `rubric[${index}].weight`),
    maxScore: requirePositiveAmount(item.maxScore, `rubric[${index}].maxScore`)
  }));
  validateUniqueIds(rubric, "rubric");
  if (Math.abs(total(rubric.map((item) => item.weight)) - 100) > 0.000001) {
    throw new Error("rubric weights must total 100");
  }

  const phases = requireArray(input.phases, "phases").map((phase, index) => {
    const deadline = requireText(phase.deadline, `phases[${index}].deadline`);
    if (Number.isNaN(Date.parse(deadline))) {
      throw new Error(`phases[${index}].deadline must be an ISO-compatible date`);
    }
    const phaseDeliverables = requireArray(phase.deliverableIds, `phases[${index}].deliverableIds`).map(
      (id, deliverableIndex) => requireText(id, `phases[${index}].deliverableIds[${deliverableIndex}]`)
    );
    return {
      id: requireText(phase.id, `phases[${index}].id`),
      deadline,
      deliverableIds: phaseDeliverables
    };
  });
  validateUniqueIds(phases, "phases");

  const deliverableIds = new Set(deliverables.map((item) => item.id));
  for (const phase of phases) {
    for (const deliverableId of phase.deliverableIds) {
      if (!deliverableIds.has(deliverableId)) {
        throw new Error(`phase ${phase.id} references unknown deliverable ${deliverableId}`);
      }
    }
  }

  const deadlines = phases.map((phase) => Date.parse(phase.deadline));
  if (deadlines.some((deadline, index) => index > 0 && deadline <= deadlines[index - 1])) {
    throw new Error("phase deadlines must be strictly increasing");
  }

  const prize = {
    currency: requireText(input.prize?.currency, "prize.currency"),
    amount: requirePositiveAmount(input.prize?.amount, "prize.amount")
  };
  const phaseIds = new Set(phases.map((phase) => phase.id));
  const payoutSchedule = requireArray(input.payoutSchedule, "payoutSchedule").map((item, index) => {
    const phaseId = requireText(item.phaseId, `payoutSchedule[${index}].phaseId`);
    if (!phaseIds.has(phaseId)) {
      throw new Error(`payout schedule references unknown phase ${phaseId}`);
    }
    return {
      id: requireText(item.id, `payoutSchedule[${index}].id`),
      phaseId,
      kind: requireChoice(item.kind, ["milestone", "final", "honorable-mention"], `payoutSchedule[${index}].kind`),
      amount: requirePositiveAmount(item.amount, `payoutSchedule[${index}].amount`)
    };
  });
  validateUniqueIds(payoutSchedule, "payoutSchedule");
  if (total(payoutSchedule.map((item) => item.amount)) > prize.amount) {
    throw new Error("payout schedule cannot exceed the prize amount");
  }

  const ipMode = requireChoice(input.ipPolicy?.mode ?? "default", IP_MODES, "ipPolicy.mode");
  if (ipMode === "sponsored") {
    requireText(input.ipPolicy?.license, "ipPolicy.license");
  }

  return {
    id: requireText(input.id, "challenge.id"),
    title: requireText(input.title, "challenge.title"),
    scientificContext: requireText(input.scientificContext, "challenge.scientificContext"),
    vertical: requireChoice(input.vertical, CHALLENGE_VERTICALS, "challenge.vertical"),
    deliverables,
    rubric,
    phases,
    prize,
    payoutSchedule,
    visibility: requireChoice(input.visibility ?? "public", VISIBILITIES, "challenge.visibility"),
    participationMode: requireChoice(
      input.participationMode ?? "named",
      PARTICIPATION_MODES,
      "challenge.participationMode"
    ),
    prequalificationRequired: input.prequalificationRequired === true,
    ndaRequired: input.ndaRequired === true,
    ipPolicy: {
      mode: ipMode,
      license: input.ipPolicy?.license ? requireText(input.ipPolicy.license, "ipPolicy.license") : null
    },
    escrow: {
      currency: requireText(input.escrow?.currency, "escrow.currency"),
      fundedAmount: requirePositiveAmount(input.escrow?.fundedAmount, "escrow.fundedAmount"),
      reference: requireText(input.escrow?.reference, "escrow.reference")
    }
  };
}

export class ScientificBountySystem {
  #clock;
  #challenges = new Map();
  #workspaces = new Map();
  #submissions = new Map();
  #reviews = new Map();
  #awards = new Map();
  #events = [];

  constructor({ clock = () => new Date().toISOString() } = {}) {
    this.#clock = clock;
  }

  #record(type, subjectId, details = {}) {
    const event = {
      sequence: this.#events.length + 1,
      at: this.#clock(),
      type,
      subjectId,
      details: copy(details)
    };
    this.#events.push(event);
    return event;
  }

  postChallenge(input) {
    const challenge = validateChallengeInput(input);
    if (this.#challenges.has(challenge.id)) {
      throw new Error(`challenge ${challenge.id} already exists`);
    }
    if (challenge.escrow.currency !== challenge.prize.currency) {
      throw new Error("escrow and prize currencies must match");
    }

    const record = {
      ...challenge,
      template: CHALLENGE_TEMPLATES[challenge.vertical],
      escrowAvailable: challenge.escrow.fundedAmount,
      status: challenge.escrow.fundedAmount >= challenge.prize.amount ? "open" : "draft"
    };
    this.#challenges.set(record.id, record);
    this.#record("challenge.posted", record.id, { status: record.status, visibility: record.visibility });
    return copy(record);
  }

  openWorkspace(challengeId, input) {
    const challenge = this.#challenges.get(challengeId);
    if (!challenge || challenge.status !== "open") {
      throw new Error(`challenge ${challengeId} is not open`);
    }
    const id = requireText(input.id, "workspace.id");
    if (this.#workspaces.has(id)) {
      throw new Error(`workspace ${id} already exists`);
    }
    if (challenge.prequalificationRequired && input.prequalificationApproved !== true) {
      throw new Error("prequalification approval is required");
    }
    const ndaAcceptedAt =
      input.ndaAcceptedAt == null ? null : requireIsoDate(input.ndaAcceptedAt, "workspace.ndaAcceptedAt");
    if (challenge.ndaRequired && ndaAcceptedAt == null) {
      throw new Error("NDA acceptance is required");
    }

    const teamId = requireText(input.teamId, "workspace.teamId");
    const workspace = {
      id,
      challengeId,
      teamId,
      displayName:
        challenge.participationMode === "anonymous"
          ? requireText(input.pseudonym, "workspace.pseudonym")
          : requireText(input.teamName, "workspace.teamName"),
      participationMode: challenge.participationMode,
      memberIds: requireArray(input.memberIds, "workspace.memberIds").map((memberId, index) =>
        requireText(memberId, `workspace.memberIds[${index}]`)
      ),
      ndaAcceptedAt,
      versions: []
    };
    this.#workspaces.set(id, workspace);
    this.#record("workspace.opened", id, { challengeId, participationMode: workspace.participationMode });
    return this.viewWorkspace(id, { role: "team", teamId });
  }

  submit(workspaceId, input) {
    const workspace = this.#workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`workspace ${workspaceId} does not exist`);
    }
    const challenge = this.#challenges.get(workspace.challengeId);
    const phase = challenge.phases.find((candidate) => candidate.id === input.phaseId);
    if (!phase) {
      throw new Error(`unknown phase ${input.phaseId}`);
    }

    const id = requireText(input.id, "submission.id");
    if (this.#submissions.has(id)) {
      throw new Error(`submission ${id} already exists`);
    }
    const deliverableIds = requireArray(input.deliverableIds, "submission.deliverableIds").map(
      (deliverableId, index) => requireText(deliverableId, `submission.deliverableIds[${index}]`)
    );
    const missing = phase.deliverableIds.filter((deliverableId) => !deliverableIds.includes(deliverableId));
    if (missing.length > 0) {
      throw new Error(`submission is missing phase deliverables: ${missing.join(", ")}`);
    }
    const artifacts = requireArray(input.artifacts, "submission.artifacts").map((artifact, index) => ({
      path: requireText(artifact.path, `submission.artifacts[${index}].path`),
      sha256: requireSha256(artifact.sha256, `submission.artifacts[${index}].sha256`),
      license: requireText(artifact.license, `submission.artifacts[${index}].license`),
      dataset: requireText(artifact.dataset, `submission.artifacts[${index}].dataset`)
    }));

    const version = workspace.versions.length + 1;
    const submission = {
      id,
      challengeId: challenge.id,
      workspaceId,
      teamId: workspace.teamId,
      displayName: workspace.displayName,
      phaseId: phase.id,
      version,
      title: requireText(input.title, "submission.title"),
      abstract: requireText(input.abstract, "submission.abstract"),
      reproducibilityNote: requireText(input.reproducibilityNote, "submission.reproducibilityNote"),
      deliverableIds,
      artifacts,
      submittedAt: this.#clock()
    };
    workspace.versions.push(id);
    this.#submissions.set(id, submission);
    this.#record("submission.created", id, { workspaceId, phaseId: phase.id, version });
    return this.viewSubmission(id, { role: "team", teamId: workspace.teamId });
  }

  review(submissionId, input) {
    const submission = this.#submissions.get(submissionId);
    if (!submission) {
      throw new Error(`submission ${submissionId} does not exist`);
    }
    const challenge = this.#challenges.get(submission.challengeId);
    const reviewerId = requireText(input.reviewerId, "review.reviewerId");
    if (input.reviewerTeamId && input.reviewerTeamId === submission.teamId) {
      throw new Error("reviewers cannot evaluate their own team");
    }

    const scores = requireArray(input.scores, "review.scores");
    const scoreIds = scores.map((score, index) =>
      requireText(score.criterionId, `review.scores[${index}].criterionId`)
    );
    if (new Set(scoreIds).size !== scoreIds.length) {
      throw new Error("review criterion scores must be unique");
    }
    const rubricIds = new Set(challenge.rubric.map((criterion) => criterion.id));
    const unknownCriterion = scoreIds.find((criterionId) => !rubricIds.has(criterionId));
    if (unknownCriterion) {
      throw new Error(`review references unknown criterion ${unknownCriterion}`);
    }
    const scoreByCriterion = new Map(scores.map((score, index) => [scoreIds[index], score.score]));
    let weightedScore = 0;
    for (const criterion of challenge.rubric) {
      const score = scoreByCriterion.get(criterion.id);
      if (!Number.isFinite(score) || score < 0 || score > criterion.maxScore) {
        throw new Error(`score for ${criterion.id} must be between 0 and ${criterion.maxScore}`);
      }
      weightedScore += (score / criterion.maxScore) * criterion.weight;
    }

    const checklist = requireArray(input.checklist, "review.checklist").map((item, index) => ({
      item: requireText(item.item, `review.checklist[${index}].item`),
      passed: item.passed === true
    }));
    const provenanceDecision = requireChoice(
      input.provenanceDecision,
      ["release", "revise", "hold"],
      "review.provenanceDecision"
    );
    const id = requireText(input.id, "review.id");
    if (this.#reviews.has(id)) {
      throw new Error(`review ${id} already exists`);
    }

    const review = {
      id,
      submissionId,
      reviewerId,
      weightedScore: Number(weightedScore.toFixed(2)),
      checklist,
      provenanceDecision,
      feedback: requireText(input.feedback, "review.feedback"),
      decision:
        checklist.every((item) => item.passed) && provenanceDecision === "release" && weightedScore >= 70
          ? "accept"
          : "revise"
    };
    this.#reviews.set(id, review);
    this.#record("submission.reviewed", submissionId, {
      reviewId: id,
      reviewerId,
      decision: review.decision,
      weightedScore: review.weightedScore
    });
    return copy(review);
  }

  planAward(submissionId, input) {
    const submission = this.#submissions.get(submissionId);
    if (!submission) {
      throw new Error(`submission ${submissionId} does not exist`);
    }
    const challenge = this.#challenges.get(submission.challengeId);
    const review = this.#reviews.get(input.reviewId);
    if (!review || review.submissionId !== submissionId || review.decision !== "accept") {
      throw new Error("an accepted review for this submission is required");
    }
    const schedule = challenge.payoutSchedule.find((item) => item.id === input.scheduleId);
    if (!schedule || schedule.phaseId !== submission.phaseId) {
      throw new Error("award must use a payout schedule entry for the submitted phase");
    }
    if ([...this.#awards.values()].some((award) => award.challengeId === challenge.id && award.scheduleId === schedule.id)) {
      throw new Error(`payout schedule ${schedule.id} is already allocated`);
    }
    if (challenge.escrowAvailable < schedule.amount) {
      throw new Error("escrow does not contain enough available funds");
    }

    const routes = requireArray(input.routes, "award.routes").map((route, index) => ({
      recipientId: requireText(route.recipientId, `award.routes[${index}].recipientId`),
      recipientType: requireChoice(
        route.recipientType,
        RECIPIENT_TYPES,
        `award.routes[${index}].recipientType`
      ),
      amount: requirePositiveAmount(route.amount, `award.routes[${index}].amount`)
    }));
    if (Math.abs(total(routes.map((route) => route.amount)) - schedule.amount) > 0.000001) {
      throw new Error("payout routes must total the scheduled award amount");
    }

    const id = requireText(input.id, "award.id");
    if (this.#awards.has(id)) {
      throw new Error(`award ${id} already exists`);
    }
    const ipState =
      challenge.ipPolicy.mode === "open"
        ? "open-source"
        : challenge.ipPolicy.mode === "sponsored"
          ? "transfer-pending-payment"
          : "solver-retained-until-paid";
    const award = {
      id,
      challengeId: challenge.id,
      submissionId,
      reviewId: review.id,
      scheduleId: schedule.id,
      kind: schedule.kind,
      currency: challenge.prize.currency,
      amount: schedule.amount,
      routes,
      status: "planned",
      ipState,
      license: challenge.ipPolicy.license
    };
    this.#awards.set(id, award);
    this.#record("award.planned", id, { submissionId, amount: award.amount, currency: award.currency });
    return copy(award);
  }

  settleAward(awardId, input) {
    const award = this.#awards.get(awardId);
    if (!award || award.status !== "planned") {
      throw new Error(`award ${awardId} is not awaiting settlement`);
    }
    const paymentReference = requireText(input.paymentReference, "settlement.paymentReference");
    const challenge = this.#challenges.get(award.challengeId);
    if (challenge.escrowAvailable < award.amount) {
      throw new Error("escrow funds are no longer available");
    }

    challenge.escrowAvailable = Number((challenge.escrowAvailable - award.amount).toFixed(8));
    award.status = "paid";
    award.paymentReference = paymentReference;
    award.paidAt = this.#clock();
    award.ipState =
      challenge.ipPolicy.mode === "sponsored"
        ? "transferred"
        : challenge.ipPolicy.mode === "open"
          ? "open-source"
          : "solver-retained";
    this.#record("award.settled", awardId, {
      paymentReference,
      amount: award.amount,
      currency: award.currency,
      ipState: award.ipState
    });
    return copy(award);
  }

  viewWorkspace(workspaceId, actor) {
    const workspace = this.#workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`workspace ${workspaceId} does not exist`);
    }
    const challenge = this.#challenges.get(workspace.challengeId);
    const canViewIdentity =
      (challenge.visibility === "public" && challenge.participationMode === "named") ||
      actor?.role === "sponsor" ||
      actor?.role === "arbitrator" ||
      actor?.teamId === workspace.teamId;
    if (challenge.visibility === "private" && !canViewIdentity && actor?.role !== "reviewer") {
      throw new Error("private workspace access denied");
    }
    return copy({
      ...workspace,
      teamId: canViewIdentity ? workspace.teamId : null,
      memberIds: canViewIdentity ? workspace.memberIds : [],
      displayName: workspace.displayName
    });
  }

  viewSubmission(submissionId, actor) {
    const submission = this.#submissions.get(submissionId);
    if (!submission) {
      throw new Error(`submission ${submissionId} does not exist`);
    }
    const challenge = this.#challenges.get(submission.challengeId);
    const canViewIdentity =
      (challenge.visibility === "public" && challenge.participationMode === "named") ||
      actor?.role === "sponsor" ||
      actor?.role === "arbitrator" ||
      actor?.teamId === submission.teamId;
    if (challenge.visibility === "private" && !canViewIdentity && actor?.role !== "reviewer") {
      throw new Error("private submission access denied");
    }
    return copy({
      ...submission,
      teamId: canViewIdentity ? submission.teamId : null,
      displayName: submission.displayName
    });
  }

  auditLog(subjectId) {
    return copy(this.#events.filter((event) => event.subjectId === subjectId || event.details?.challengeId === subjectId));
  }
}
