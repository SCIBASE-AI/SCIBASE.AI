function evaluateSubmission(submission) {
  const findings = [];

  if (!submission.manifestComplete) findings.push("submission package manifest is incomplete");
  if (submission.artifactHashes.length === 0) findings.push("submission artifacts are missing hashes");
  if (submission.unsafeFlags.length > 0) findings.push(`unsafe artifact flags: ${submission.unsafeFlags.join(", ")}`);
  if (submission.sponsorVisible && findings.length > 0) findings.push("sponsor visibility is enabled before quarantine clearance");
  if (!submission.reviewerPreview) findings.push("reviewer-safe preview is missing");
  if (submission.ipStatement === "missing") findings.push("IP handoff statement is missing");

  const decision = findings.length === 0 ? "release-to-review" : "quarantine-submission";
  const actions = decision === "release-to-review"
    ? ["release package to reviewer queue", "keep sponsor access gated until award decision"]
    : ["quarantine package", "disable sponsor visibility", "request manifest and safety remediation"];

  return {
    id: submission.id,
    challengeId: submission.challengeId,
    teamId: submission.teamId,
    decision,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const submissions = batch.submissions.map(evaluateSubmission);
  const summary = submissions.reduce((acc, submission) => {
    acc.total += 1;
    acc[submission.decision] = (acc[submission.decision] || 0) + 1;
    acc.findingCount += submission.findings.length;
    return acc;
  }, { total: 0, findingCount: 0 });

  return { batchId: batch.id, generatedAt: batch.generatedAt, summary, submissions };
}

module.exports = { evaluateSubmission, evaluateBatch };
