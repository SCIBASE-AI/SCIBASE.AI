const REQUIRED_REVIEWERS = 2;

function scoreChallenge(challenge) {
  const requiredExpertise = new Set(challenge.requiredExpertise || []);
  const reviewers = challenge.reviewers || [];

  const eligible = reviewers.filter((reviewer) => {
    const hasConflict = (reviewer.conflicts || []).includes(challenge.id);
    const isOverloaded = reviewer.activeReviews >= reviewer.maxActiveReviews;
    const coversExpertise = (reviewer.expertise || []).some((item) => requiredExpertise.has(item));
    return !hasConflict && !isOverloaded && reviewer.trainingCurrent && reviewer.available;
  });

  const coveredExpertise = new Set();
  for (const reviewer of eligible) {
    for (const item of reviewer.expertise || []) {
      if (requiredExpertise.has(item)) coveredExpertise.add(item);
    }
  }

  const missingExpertise = [...requiredExpertise].filter((item) => !coveredExpertise.has(item));
  const overloaded = reviewers.filter((reviewer) => reviewer.activeReviews >= reviewer.maxActiveReviews);
  const conflicted = reviewers.filter((reviewer) => (reviewer.conflicts || []).includes(challenge.id));
  const staleTraining = reviewers.filter((reviewer) => !reviewer.trainingCurrent);

  const blockers = [];
  if (eligible.length < REQUIRED_REVIEWERS) blockers.push("not enough eligible reviewers");
  if (missingExpertise.length) blockers.push(`missing expertise: ${missingExpertise.join(", ")}`);
  if (conflicted.length) blockers.push(`conflicts: ${conflicted.map((r) => r.id).join(", ")}`);
  if (overloaded.length) blockers.push(`overloaded: ${overloaded.map((r) => r.id).join(", ")}`);
  if (staleTraining.length) blockers.push(`stale training: ${staleTraining.map((r) => r.id).join(", ")}`);

  let decision = "ASSIGN_PANEL";
  if (eligible.length < REQUIRED_REVIEWERS || missingExpertise.length) {
    decision = "HOLD_ASSIGNMENT";
  } else if (conflicted.length || overloaded.length || staleTraining.length) {
    decision = "REBALANCE_PANEL";
  }

  return {
    challengeId: challenge.id,
    title: challenge.title,
    decision,
    eligibleReviewers: eligible.map((reviewer) => reviewer.id),
    missingExpertise,
    blockers,
    nextStep: nextStepFor(decision),
  };
}

function nextStepFor(decision) {
  if (decision === "ASSIGN_PANEL") return "assign the listed reviewers and open the review window";
  if (decision === "REBALANCE_PANEL") return "rebalance reviewer load or replace conflicted reviewers";
  return "hold assignment until coverage and capacity are fixed";
}

function evaluatePortfolio(challenges) {
  return challenges.map(scoreChallenge);
}

function renderMarkdownReport(results) {
  const lines = ["# Scientific bounty reviewer capacity report", ""];
  for (const result of results) {
    lines.push(`## ${result.challengeId}: ${result.title}`);
    lines.push(`Decision: ${result.decision}`);
    lines.push(`Eligible reviewers: ${result.eligibleReviewers.join(", ") || "none"}`);
    lines.push(`Next step: ${result.nextStep}`);
    if (result.blockers.length) {
      lines.push("Blockers:");
      for (const blocker of result.blockers) lines.push(`- ${blocker}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  evaluatePortfolio,
  renderMarkdownReport,
  scoreChallenge,
};
