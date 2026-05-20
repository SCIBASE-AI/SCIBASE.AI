const COMPONENT_TYPES = new Set([
  "manuscript",
  "data",
  "code",
  "notebook",
  "results",
  "protocol",
  "metadata",
]);

function evaluateRepository(repository) {
  const hypotheses = new Map(repository.hypotheses.map((item) => [item.id, item]));
  const protocols = new Map(repository.protocols.map((item) => [item.id, item]));

  const packets = repository.branches.map((branch) =>
    evaluateBranch(branch, repository, hypotheses, protocols),
  );

  const summary = packets.reduce(
    (acc, packet) => {
      acc.total += 1;
      acc[packet.decision] += 1;
      acc.highestRisk = Math.max(acc.highestRisk, packet.riskScore);
      return acc;
    },
    { total: 0, ready: 0, hold: 0, block: 0, highestRisk: 0 },
  );

  return {
    repository: repository.id,
    version: repository.currentVersion,
    generatedAt: "2026-05-20T00:00:00.000Z",
    summary,
    packets,
  };
}

function evaluateBranch(branch, repository, hypotheses, protocols) {
  const findings = [];
  const hypothesis = hypotheses.get(branch.hypothesisId);
  const protocol = hypothesis ? protocols.get(hypothesis.protocolId) : null;
  const changedTypes = new Set(branch.changedComponents.map((component) => component.type));

  if (!hypothesis) {
    findings.push(blocker("missing-hypothesis", "Branch does not reference a declared hypothesis."));
  } else {
    if (hypothesis.status !== "approved") {
      findings.push(blocker("hypothesis-not-approved", `Hypothesis ${hypothesis.id} is ${hypothesis.status}.`));
    }

    const missingExpectedTypes = hypothesis.expectedComponents.filter(
      (type) => !changedTypes.has(type),
    );
    if (missingExpectedTypes.length > 0) {
      findings.push(
        warning(
          "hypothesis-component-gap",
          `Expected component types not changed: ${missingExpectedTypes.join(", ")}.`,
        ),
      );
    }
  }

  if (!protocol) {
    findings.push(blocker("missing-protocol", "No protocol snapshot is linked to the branch hypothesis."));
  } else {
    if (!protocol.frozen) {
      findings.push(blocker("protocol-not-frozen", `Protocol ${protocol.id} is not frozen.`));
    }
    if (branch.protocolSnapshot !== protocol.snapshot) {
      findings.push(
        blocker(
          "protocol-snapshot-mismatch",
          `Branch uses ${branch.protocolSnapshot}, expected ${protocol.snapshot}.`,
        ),
      );
    }
    if (protocol.approvedBy.length === 0) {
      findings.push(warning("protocol-unapproved", `Protocol ${protocol.id} has no approvers.`));
    }
  }

  findings.push(...evaluateComponents(branch.changedComponents));
  findings.push(...evaluateResultLineage(branch.changedComponents));
  findings.push(...evaluateReproducibility(branch));
  findings.push(...evaluateForkAttribution(branch, repository));

  const versionImpact = recommendVersionImpact(branch.changedComponents, branch.citations);
  const citationNotes = buildCitationNotes(branch.citations, repository, versionImpact);
  const riskScore = scoreFindings(findings);
  const decision = chooseDecision(findings, riskScore);

  return {
    branch: branch.name,
    hypothesisId: branch.hypothesisId,
    protocolSnapshot: branch.protocolSnapshot,
    decision,
    riskScore,
    versionImpact,
    citationNotes,
    reviewerApprovals: branch.reviewerApprovals,
    findings,
  };
}

function evaluateComponents(components) {
  const findings = [];
  const seenPaths = new Set();

  for (const component of components) {
    if (seenPaths.has(component.path)) {
      findings.push(blocker("duplicate-component", `${component.path} is listed more than once.`));
    }
    seenPaths.add(component.path);

    if (!COMPONENT_TYPES.has(component.type)) {
      findings.push(blocker("unknown-component-type", `${component.path} uses unknown type ${component.type}.`));
    }

    if (!component.hash || !component.hash.startsWith("sha256:")) {
      findings.push(blocker("missing-component-hash", `${component.path} needs a sha256 content hash.`));
    }

    if (component.largeFile && !component.lfsTracked) {
      findings.push(blocker("large-file-not-lfs", `${component.path} is large but not routed through LFS.`));
    }
  }

  return findings;
}

function evaluateResultLineage(components) {
  const findings = [];
  const componentPaths = new Set(components.map((component) => component.path));

  for (const result of components.filter((component) => component.type === "results")) {
    if (!Array.isArray(result.inputs) || result.inputs.length === 0) {
      findings.push(blocker("result-without-inputs", `${result.path} has no input lineage.`));
      continue;
    }

    const missingInputs = result.inputs.filter((input) => !componentPaths.has(input));
    if (missingInputs.length > 0) {
      findings.push(
        blocker(
          "result-input-missing",
          `${result.path} references missing inputs: ${missingInputs.join(", ")}.`,
        ),
      );
    }
  }

  return findings;
}

function evaluateReproducibility(branch) {
  const findings = [];
  const resultPaths = branch.changedComponents
    .filter((component) => component.type === "results")
    .map((component) => component.path);
  const passingRuns = branch.reproducibilityRuns.filter((run) => run.status === "passed");

  if (resultPaths.length > 0 && passingRuns.length === 0) {
    findings.push(blocker("no-passing-repro-run", "Changed result artifacts need a passing reproducibility run."));
    return findings;
  }

  for (const resultPath of resultPaths) {
    const covered = passingRuns.some((run) => run.generatedResults.includes(resultPath));
    if (!covered) {
      findings.push(blocker("result-not-reproduced", `${resultPath} is not covered by a passing run.`));
    }
  }

  return findings;
}

function evaluateForkAttribution(branch, repository) {
  if (branch.forkOf === repository.defaultBranch || branch.forkOf === "main") return [];
  if (!branch.forkOf || !branch.forkAt || !branch.declaredBase) {
    return [blocker("missing-fork-attribution", "External fork branches need fork source and base attribution.")];
  }
  return [
    info(
      "external-fork-attribution",
      `Branch derives from ${branch.forkOf} at ${branch.forkAt}; preserve this in merge notes.`,
    ),
  ];
}

function recommendVersionImpact(components, citations) {
  if (citations.doiTargetChanged || components.some((component) => component.type === "protocol")) {
    return "major";
  }
  if (
    citations.metadataChanged ||
    components.some((component) => ["data", "notebook", "results"].includes(component.type))
  ) {
    return "minor";
  }
  return "patch";
}

function buildCitationNotes(citations, repository, versionImpact) {
  const notes = [`Recommend ${versionImpact} version impact from ${repository.currentVersion}.`];

  if (citations.authorsChanged) {
    notes.push("Refresh author/contributor citation metadata before tagging.");
  }
  if (citations.metadataChanged) {
    notes.push("Regenerate schema.org and BibTeX metadata before export.");
  }
  if (citations.doiTargetChanged) {
    notes.push(`Review DOI target continuity for ${repository.doi}.`);
  }

  return notes;
}

function chooseDecision(findings, riskScore) {
  if (findings.some((finding) => finding.severity === "blocker")) return "block";
  if (riskScore >= 35 || findings.some((finding) => finding.severity === "warning")) return "hold";
  return "ready";
}

function scoreFindings(findings) {
  return findings.reduce((total, finding) => {
    if (finding.severity === "blocker") return total + 30;
    if (finding.severity === "warning") return total + 10;
    return total + 2;
  }, 0);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function warning(code, message) {
  return { severity: "warning", code, message };
}

function info(code, message) {
  return { severity: "info", code, message };
}

module.exports = {
  evaluateRepository,
  evaluateBranch,
  recommendVersionImpact,
};
