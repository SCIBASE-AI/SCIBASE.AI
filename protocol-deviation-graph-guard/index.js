const fs = require("fs");
const path = require("path");

const SEVERITY_POINTS = {
  info: 5,
  medium: 20,
  high: 35,
  critical: 55
};

function asArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function asNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function daysBetween(firstDate, secondDate) {
  const first = new Date(`${firstDate}T00:00:00.000Z`);
  const second = new Date(`${secondDate}T00:00:00.000Z`);
  return Math.round((second.getTime() - first.getTime()) / 86400000);
}

function indexById(items, field) {
  const map = new Map();
  for (const item of asArray(items, field)) {
    map.set(asNonEmptyString(item.id, `${field}.id`), item);
  }
  return map;
}

function compareParameters(protocolStep, observedStep, experiment) {
  const findings = [];
  const expectedParams = protocolStep.parameters || {};
  const observedParams = observedStep.observed || {};

  for (const [name, rule] of Object.entries(expectedParams)) {
    const observed = observedParams[name];
    if (typeof observed !== "number") {
      findings.push({
        severity: "high",
        code: "missing-parameter",
        experimentId: experiment.id,
        stepId: protocolStep.id,
        message: `${name} was not recorded for ${protocolStep.label}`
      });
      continue;
    }

    const delta = Math.abs(observed - rule.expected);
    if (delta > rule.tolerance) {
      findings.push({
        severity: delta > rule.tolerance * 2 ? "critical" : "high",
        code: "parameter-out-of-tolerance",
        experimentId: experiment.id,
        stepId: protocolStep.id,
        message: `${name}=${observed} deviates from ${rule.expected} by ${delta}, tolerance ${rule.tolerance}`
      });
    }
  }

  return findings;
}

function auditExperiment(protocol, experiment) {
  const findings = [];
  const observedSteps = indexById(experiment.steps || [], `${experiment.id}.steps`);

  if (experiment.protocolVersion !== protocol.version) {
    findings.push({
      severity: "high",
      code: "protocol-version-mismatch",
      experimentId: experiment.id,
      message: `experiment used ${experiment.protocolVersion}, current protocol is ${protocol.version}`
    });
  }

  const calibrationDriftDays = daysBetween(protocol.calibrationValidUntil, experiment.performedAt);
  if (calibrationDriftDays > 0) {
    findings.push({
      severity: calibrationDriftDays > 14 ? "critical" : "high",
      code: "instrument-calibration-expired",
      experimentId: experiment.id,
      message: `${experiment.instrumentId} calibration expired ${calibrationDriftDays} days before run`
    });
  }

  const allowedLots = new Set(protocol.allowedReagentLots || []);
  for (const lot of experiment.reagentLots || []) {
    if (!allowedLots.has(lot)) {
      findings.push({
        severity: "high",
        code: "unauthorized-reagent-lot",
        experimentId: experiment.id,
        message: `${lot} is not approved for ${protocol.id}`
      });
    }
  }

  for (const step of protocol.requiredSteps || []) {
    const observed = observedSteps.get(step.id);
    if (step.required && !observed) {
      findings.push({
        severity: "critical",
        code: "missing-required-step",
        experimentId: experiment.id,
        stepId: step.id,
        message: `${step.label} was not observed`
      });
      continue;
    }

    if (observed) {
      findings.push(...compareParameters(step, observed, experiment));
    }
  }

  return findings;
}

function scoreFindings(findings) {
  return Math.min(
    100,
    findings.reduce((total, finding) => total + SEVERITY_POINTS[finding.severity], 0)
  );
}

function buildEdgeActions(experiment, findings) {
  const riskScore = scoreFindings(findings);
  const action =
    findings.some((finding) => finding.severity === "critical") || riskScore >= 70
      ? "hold"
      : riskScore >= 35
        ? "review"
        : "publish";

  return (experiment.proposedEdges || []).map((edge) => ({
    ...edge,
    action,
    riskScore,
    reason:
      action === "publish"
        ? "protocol adherence evidence is sufficient"
        : "protocol deviation evidence must be resolved before graph publication"
  }));
}

function auditProtocolDeviationGraph(packet) {
  const protocols = indexById(packet.protocols || [], "protocols");
  const experiments = asArray(packet.experiments || [], "experiments");

  const experimentReports = experiments.map((experiment) => {
    const protocol = protocols.get(asNonEmptyString(experiment.protocolId, "experiment.protocolId"));
    if (!protocol) {
      const findings = [
        {
          severity: "critical",
          code: "unknown-protocol",
          experimentId: experiment.id,
          message: `protocol ${experiment.protocolId} is not registered`
        }
      ];
      return {
        experimentId: experiment.id,
        protocolId: experiment.protocolId,
        riskScore: scoreFindings(findings),
        decision: "hold",
        findings,
        edgeActions: buildEdgeActions(experiment, findings)
      };
    }

    const findings = auditExperiment(protocol, experiment);
    const riskScore = scoreFindings(findings);
    const edgeActions = buildEdgeActions(experiment, findings);
    const decision = edgeActions.some((edge) => edge.action === "hold")
      ? "hold"
      : edgeActions.some((edge) => edge.action === "review")
        ? "review"
        : "publish";

    return {
      experimentId: experiment.id,
      protocolId: protocol.id,
      riskScore,
      decision,
      findings,
      edgeActions
    };
  });

  const totals = experimentReports.reduce(
    (acc, report) => {
      acc.experiments += 1;
      acc.findings += report.findings.length;
      acc.holdEdges += report.edgeActions.filter((edge) => edge.action === "hold").length;
      acc.reviewEdges += report.edgeActions.filter((edge) => edge.action === "review").length;
      acc.publishEdges += report.edgeActions.filter((edge) => edge.action === "publish").length;
      return acc;
    },
    { experiments: 0, findings: 0, holdEdges: 0, reviewEdges: 0, publishEdges: 0 }
  );

  return {
    generatedAt: packet.generatedAt || new Date().toISOString(),
    module: "protocol-deviation-graph-guard",
    decision: totals.holdEdges > 0 ? "hold-unsafe-graph-edges" : "publish-safe-graph-edges",
    totals,
    experimentReports
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Protocol Deviation Graph Guard Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Decision: ${report.decision}`,
    "",
    "## Totals",
    "",
    `- Experiments audited: ${report.totals.experiments}`,
    `- Findings: ${report.totals.findings}`,
    `- Hold edges: ${report.totals.holdEdges}`,
    `- Review edges: ${report.totals.reviewEdges}`,
    `- Publish edges: ${report.totals.publishEdges}`,
    "",
    "## Experiment Decisions",
    ""
  ];

  for (const experiment of report.experimentReports) {
    lines.push(`### ${experiment.experimentId}`);
    lines.push("");
    lines.push(`- Protocol: ${experiment.protocolId}`);
    lines.push(`- Risk score: ${experiment.riskScore}`);
    lines.push(`- Decision: ${experiment.decision}`);
    lines.push(`- Edge actions: ${experiment.edgeActions.map((edge) => `${edge.type}:${edge.action}`).join(", ")}`);
    if (experiment.findings.length === 0) {
      lines.push("- Findings: none");
    } else {
      for (const finding of experiment.findings) {
        lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
      }
    }
    lines.push("");
  }

  lines.push("Synthetic data only. No private research data, payment systems, live graph services, or external APIs are used.");
  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  const safe = report.totals.publishEdges;
  const held = report.totals.holdEdges;
  const findings = report.totals.findings;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420" role="img" aria-label="Protocol deviation graph guard summary">
  <rect width="960" height="420" fill="#102033"/>
  <text x="48" y="72" fill="#f8fafc" font-family="Arial, sans-serif" font-size="34" font-weight="700">Protocol Deviation Graph Guard</text>
  <text x="48" y="114" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">Recommendation-safe graph publication control for SCIBASE #17</text>
  <rect x="48" y="160" width="248" height="144" rx="12" fill="#123f5c" stroke="#38bdf8"/>
  <text x="78" y="216" fill="#e0f2fe" font-family="Arial, sans-serif" font-size="48" font-weight="700">${safe}</text>
  <text x="78" y="254" fill="#bae6fd" font-family="Arial, sans-serif" font-size="20">publishable edges</text>
  <rect x="356" y="160" width="248" height="144" rx="12" fill="#4c1d1d" stroke="#f87171"/>
  <text x="386" y="216" fill="#fee2e2" font-family="Arial, sans-serif" font-size="48" font-weight="700">${held}</text>
  <text x="386" y="254" fill="#fecaca" font-family="Arial, sans-serif" font-size="20">held graph edges</text>
  <rect x="664" y="160" width="248" height="144" rx="12" fill="#422006" stroke="#facc15"/>
  <text x="694" y="216" fill="#fef3c7" font-family="Arial, sans-serif" font-size="48" font-weight="700">${findings}</text>
  <text x="694" y="254" fill="#fde68a" font-family="Arial, sans-serif" font-size="20">protocol findings</text>
  <text x="48" y="356" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">Synthetic reviewer artifact. No live graph, credentials, private studies, or external APIs.</text>
</svg>
`;
}

function writeReportArtifacts(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "protocol-deviation-report.json");
  const markdownPath = path.join(outputDir, "protocol-deviation-report.md");
  const svgPath = path.join(outputDir, "summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(report));
  fs.writeFileSync(svgPath, renderSvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  auditProtocolDeviationGraph,
  renderMarkdown,
  renderSvg,
  writeReportArtifacts
};
