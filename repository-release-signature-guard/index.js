const REQUIRED_COMPONENTS = ["manuscript", "data", "code", "notebooks", "protocols", "results", "metadata"];
const REVIEW_NOW = Date.parse("2026-05-28T00:00:00Z");

function addIssue(issues, severity, code, message, context) {
  issues.push({ severity, code, message, context });
}

function signatureIsExpired(signature) {
  if (!signature || !signature.expiresAt) return false;
  return Date.parse(signature.expiresAt) <= REVIEW_NOW;
}

function checkSignature(release, kind, signature, issues, actions) {
  if (!signature || !signature.present) {
    addIssue(issues, "critical", `missing-${kind}-signature`, `${kind} signature is missing.`, release.id);
    actions.push(`Create a trusted ${kind} signature before publishing ${release.tag}.`);
    return;
  }

  if (!signature.trustedSigner) {
    addIssue(issues, "critical", `untrusted-${kind}-signer`, `${kind} signature signer is not trusted for this repository.`, signature.signer);
    actions.push(`Rotate ${kind} signing identity to an approved project signer.`);
  }

  if (signatureIsExpired(signature)) {
    addIssue(issues, "high", `expired-${kind}-signature`, `${kind} signature expired before release review.`, signature.signer);
    actions.push(`Re-sign ${release.tag} with a current trusted key.`);
  }
}

function checkCitationAndBundle(release, issues, actions) {
  if (release.exportBundle.tag !== release.tag || release.exportBundle.commit !== release.commit) {
    addIssue(issues, "critical", "export-target-drift", "Export bundle tag or commit does not match the release target.", release.exportBundle.manifestHash);
    actions.push("Regenerate the export bundle from the signed release target.");
  }

  if (release.citation.tag !== release.tag || release.citation.commit !== release.commit) {
    addIssue(issues, "high", "citation-target-drift", "Citation metadata references a different tag or commit.", release.citation.doi);
    actions.push("Update citation metadata before DOI publication.");
  }
}

function checkAttestation(release, issues, actions) {
  const attestation = release.attestation || {};
  if (!attestation.present) {
    addIssue(issues, "critical", "missing-release-attestation", "Signed release attestation is missing.", release.id);
    actions.push("Generate a release attestation that covers the tag, commit, bundle, and component hashes.");
    return;
  }

  if (attestation.subjectTag !== release.tag || attestation.subjectCommit !== release.commit) {
    addIssue(issues, "critical", "attestation-target-drift", "Attestation subject does not match the release tag and commit.", release.id);
    actions.push("Reissue the attestation for the exact signed release target.");
  }

  if (attestation.manifestHash !== release.exportBundle.manifestHash) {
    addIssue(issues, "critical", "attestation-manifest-drift", "Attestation manifest hash does not match the export bundle.", release.exportBundle.manifestHash);
    actions.push("Rebuild or re-sign the export bundle attestation.");
  }

  const presentComponents = Object.keys(release.exportBundle.componentHashes || {});
  for (const component of presentComponents) {
    if (!(attestation.coveredComponents || []).includes(component)) {
      addIssue(issues, "high", "component-not-attested", `Component ${component} is present in the bundle but absent from the attestation.`, component);
      actions.push(`Add ${component} hash evidence to the release attestation.`);
    }
  }

  const missingCoreComponents = REQUIRED_COMPONENTS.filter((component) => !presentComponents.includes(component));
  for (const component of missingCoreComponents) {
    addIssue(issues, "low", "optional-component-absent", `Core repository component ${component} is absent from this release bundle.`, component);
  }

  if (release.forkedFrom && !(attestation.forkAttribution || []).includes(release.forkedFrom)) {
    addIssue(issues, "high", "missing-fork-attribution", "Fork-derived release lacks signed upstream attribution.", release.forkedFrom);
    actions.push("Add upstream fork attribution to the signed release provenance packet.");
  }
}

function scoreFromIssues(issues) {
  const weights = { critical: 32, high: 14, medium: 7, low: 2 };
  const deduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] || 4), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromIssues(issues) {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const high = issues.filter((issue) => issue.severity === "high").length;
  if (critical > 0) return "hold-release";
  if (high > 0) return "re-sign-before-publication";
  return "publish";
}

function reviewRelease(release) {
  const issues = [];
  const actions = [];

  checkSignature(release, "tag", release.tagSignature, issues, actions);
  checkSignature(release, "commit", release.commitSignature, issues, actions);
  checkCitationAndBundle(release, issues, actions);
  checkAttestation(release, issues, actions);

  if (actions.length === 0) {
    actions.push("Publish release, DOI metadata, citation badge, and export bundle from the signed target.");
  }

  return {
    releaseId: release.id,
    repositoryId: release.repositoryId,
    tag: release.tag,
    commit: release.commit,
    doi: release.doi,
    decision: decisionFromIssues(issues),
    signatureScore: scoreFromIssues(issues),
    issueCounts: issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {}),
    issues,
    actions: Array.from(new Set(actions)),
  };
}

function reviewReleases(releases) {
  const results = releases.map(reviewRelease);
  const summary = {
    releaseCount: results.length,
    publishable: results.filter((result) => result.decision === "publish").length,
    resignBeforePublication: results.filter((result) => result.decision === "re-sign-before-publication").length,
    held: results.filter((result) => result.decision === "hold-release").length,
    averageSignatureScore: Math.round(results.reduce((sum, result) => sum + result.signatureScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "File and metadata versioning: verifies immutable signed tags and commit targets.",
      "Repository identifiers and citation: blocks DOI/citation publication when tag or commit evidence drifts.",
      "Programmatic access and export: binds export bundle manifests to signed release attestations.",
      "Collaboration and forking: preserves upstream fork attribution inside the signed provenance packet.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Repository Release Signature Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Releases reviewed: ${report.summary.releaseCount}`,
    `- Publishable: ${report.summary.publishable}`,
    `- Re-sign before publication: ${report.summary.resignBeforePublication}`,
    `- Held: ${report.summary.held}`,
    `- Average signature score: ${report.summary.averageSignatureScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Release Decisions",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.releaseId}`);
    lines.push("");
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Signature score: ${result.signatureScore}`);
    lines.push(`- Tag: ${result.tag}`);
    lines.push(`- Commit: ${result.commit}`);
    lines.push(`- Issues: ${result.issues.length}`);
    for (const action of result.actions) {
      lines.push(`- Action: ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSvgReport(report) {
  const width = 1120;
  const rowHeight = 88;
  const height = 150 + report.results.length * rowHeight;
  const rows = report.results
    .map((result, index) => {
      const y = 112 + index * rowHeight;
      const color =
        result.decision === "publish"
          ? "#2f9e44"
          : result.decision === "re-sign-before-publication"
            ? "#f08c00"
            : "#d6336c";
      const barWidth = Math.max(24, Math.round(result.signatureScore * 5.2));
      return `
  <g transform="translate(40 ${y})">
    <text x="0" y="0" class="title">${escapeHtml(result.releaseId)}</text>
    <text x="0" y="25" class="meta">Decision: ${escapeHtml(result.decision)} | Issues: ${result.issues.length}</text>
    <rect x="430" y="-18" width="540" height="22" rx="4" fill="#e9ecef"/>
    <rect x="430" y="-18" width="${barWidth}" height="22" rx="4" fill="${color}"/>
    <text x="990" y="0" class="score">${result.signatureScore}</text>
  </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .page { fill: #f8f9fa; }
    .heading { font: 700 34px Arial, sans-serif; fill: #17202a; }
    .sub { font: 16px Arial, sans-serif; fill: #495057; }
    .title { font: 700 18px Arial, sans-serif; fill: #212529; }
    .meta { font: 14px Arial, sans-serif; fill: #495057; }
    .score { font: 700 18px Arial, sans-serif; fill: #212529; text-anchor: end; }
  </style>
  <rect class="page" width="${width}" height="${height}"/>
  <text x="40" y="54" class="heading">Repository Release Signature Guard</text>
  <text x="40" y="84" class="sub">Checks signed tags, commits, attestations, DOI metadata, and export bundle parity.</text>
${rows}
</svg>
`;
}

module.exports = {
  reviewRelease,
  reviewReleases,
  renderMarkdownReport,
  renderSvgReport,
  signatureIsExpired,
};
