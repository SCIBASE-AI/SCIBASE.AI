function evaluateStudy(study) {
  const blockers = [];
  const warnings = [];

  if (!study.preregistrationId) blockers.push("missing preregistration id");
  if (!study.primaryOutcomeReported) blockers.push("primary outcome is not reported");
  if (study.primaryOutcomeChanged && !study.amendmentLogged) blockers.push("primary outcome changed without amendment");
  if (study.analysisPlanChanged && !study.deviationExplained) blockers.push("analysis plan changed without explanation");
  if (study.unplannedSubgroupClaim && !study.markedExploratory) blockers.push("unplanned subgroup claim is not marked exploratory");
  if (study.sampleSize < study.plannedSampleSize) warnings.push("sample size is below the preregistered plan");
  if (study.secondaryOutcomesPromoted) warnings.push("secondary outcomes are promoted above the primary outcome");
  if (!study.nullResultsMentioned) warnings.push("null results are not mentioned");

  let decision = "RELEASE_ASSISTANT_REVIEW";
  if (blockers.length) {
    decision = "HOLD_ASSISTANT_REVIEW";
  } else if (warnings.length) {
    decision = "FLAG_FOR_AUTHOR_CHECK";
  }

  return {
    studyId: study.id,
    title: study.title,
    decision,
    blockers,
    warnings,
    nextStep: nextStepFor(decision),
  };
}

function nextStepFor(decision) {
  if (decision === "RELEASE_ASSISTANT_REVIEW") return "release the assistant review with preregistration receipt";
  if (decision === "FLAG_FOR_AUTHOR_CHECK") return "ask authors to address warnings before final release";
  return "hold AI review output until preregistration conflicts are resolved";
}

function evaluateStudies(studies) {
  return studies.map(evaluateStudy);
}

function renderMarkdownReport(results) {
  const lines = ["# Preregistration consistency assistant report", ""];
  for (const result of results) {
    lines.push(`## ${result.studyId}: ${result.title}`);
    lines.push(`Decision: ${result.decision}`);
    lines.push(`Next step: ${result.nextStep}`);
    if (result.blockers.length) {
      lines.push("Blockers:");
      for (const blocker of result.blockers) lines.push(`- ${blocker}`);
    }
    if (result.warnings.length) {
      lines.push("Warnings:");
      for (const warning of result.warnings) lines.push(`- ${warning}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  evaluateStudies,
  evaluateStudy,
  renderMarkdownReport,
};
