const SEVERITY_WEIGHTS = {
  critical: 36,
  high: 22,
  medium: 11,
  low: 4
};

function daysBetween(a, b) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Math.floor((right - left) / (24 * 60 * 60 * 1000));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function sectionById(manuscript) {
  return new Map(manuscript.sections.map((section) => [section.id, section]));
}

function accessionPattern(kind) {
  if (kind === "code") {
    return /^(GH|GL|DOI)-[A-Za-z0-9._/-]+$/;
  }
  return /^(ZEN|DRYAD|FIGSHARE|OSF|DOI)-[A-Za-z0-9._/-]+$/;
}

function referencedAccessions(manuscript) {
  return new Set(manuscript.citations.map((citation) => normalize(citation.accessionId)).filter(Boolean));
}

function evaluateStatementReadiness(project) {
  const findings = [];
  const sections = sectionById(project.manuscript);
  const citationAccessions = referencedAccessions(project.manuscript);

  for (const sectionId of project.policy.requiredSections) {
    const section = sections.get(sectionId);
    if (!section || normalize(section.text).length < 40) {
      addFinding(
        findings,
        "critical",
        "missing-required-availability-section",
        `Required section ${sectionId} is missing or too thin for export.`,
        "Block manuscript export until the collaborative editor contains a complete availability statement.",
        [sectionId]
      );
    }
  }

  for (const citation of project.manuscript.citations) {
    if (!sections.has(citation.sectionId)) {
      addFinding(
        findings,
        "high",
        "citation-anchor-missing",
        `Citation ${citation.id} points at missing section ${citation.sectionId}.`,
        "Repair the citation anchor before generating the final manuscript package.",
        [citation.id, citation.sectionId]
      );
    }
  }

  for (const repository of project.repositories) {
    const accession = normalize(repository.accessionId);
    if (!accession) {
      addFinding(
        findings,
        "critical",
        "repository-accession-missing",
        `${repository.label} has no stable accession or repository identifier.`,
        "Attach a stable repository accession or mark the material as non-distributable with reviewer evidence.",
        [repository.id]
      );
    } else if (!accessionPattern(repository.kind).test(repository.accessionId)) {
      addFinding(
        findings,
        "high",
        "repository-accession-format-invalid",
        `${repository.label} has accession ${repository.accessionId}, which does not match accepted export formats.`,
        "Normalize the repository identifier before export so readers can resolve the artifact.",
        [repository.id, repository.accessionId]
      );
    } else if (!citationAccessions.has(accession)) {
      addFinding(
        findings,
        "medium",
        "repository-not-mentioned-in-statement",
        `${repository.label} is registered but not cited in the availability sections.`,
        "Add the repository accession to the data or code availability statement.",
        [repository.id, repository.accessionId]
      );
    }

    if (repository.kind === "dataset" && !project.policy.acceptedDatasetLicenses.includes(repository.license)) {
      addFinding(
        findings,
        "high",
        "dataset-license-missing-or-unaccepted",
        `${repository.label} has dataset license ${repository.license || "none"}.`,
        "Add an accepted dataset license or document why restricted access is required.",
        [repository.id]
      );
    }

    if (repository.kind === "code" && !project.policy.acceptedCodeLicenses.includes(repository.license)) {
      addFinding(
        findings,
        "high",
        "code-license-missing-or-unaccepted",
        `${repository.label} has code license ${repository.license || "none"}.`,
        "Add an accepted code license before exposing reproducibility controls.",
        [repository.id]
      );
    }

    if (repository.containsHumanDerivedData && !repository.deidentificationEvidenceId) {
      addFinding(
        findings,
        "critical",
        "human-derived-data-without-deidentification-evidence",
        `${repository.label} contains human-derived material without de-identification evidence.`,
        "Block export until the data steward links de-identification or restriction evidence.",
        [repository.id]
      );
    }

    if (repository.access === "embargoed" && repository.releaseDate) {
      const releaseLag = daysBetween(project.manuscript.exportDeadline, repository.releaseDate);
      if (releaseLag > project.policy.publicReleaseGraceDays) {
        addFinding(
          findings,
          "medium",
          "embargo-release-lags-export",
          `${repository.label} releases ${releaseLag} days after the manuscript export deadline.`,
          "Confirm the target journal accepts this availability timing before final export.",
          [repository.id, repository.releaseDate]
        );
      }
    }

    if (repository.access !== "public" && repository.reviewerLinkExpiresAt) {
      const reviewerDays = daysBetween(project.asOfDate, repository.reviewerLinkExpiresAt);
      if (reviewerDays < project.policy.reviewerLinkMinimumDays) {
        addFinding(
          findings,
          "high",
          "reviewer-link-expires-before-review-window",
          `${repository.label} reviewer access expires in ${reviewerDays} days.`,
          "Refresh reviewer-only links before export so peer reviewers can inspect restricted artifacts.",
          [repository.id, repository.reviewerLinkExpiresAt]
        );
      }
    }
  }

  for (const role of project.policy.requiredApproverRoles) {
    const approver = project.collaborators.find((collaborator) => collaborator.role === role);
    if (!approver || approver.approval !== "approved") {
      addFinding(
        findings,
        "high",
        "required-availability-approver-missing",
        `Required ${role} approval is not complete.`,
        "Hold export until all role-based collaborators approve the availability statement.",
        [role]
      );
    }
  }

  for (const comment of project.editorState.unresolvedComments) {
    if (comment.severity === "blocking") {
      addFinding(
        findings,
        "high",
        "blocking-availability-comment-open",
        `Blocking comment ${comment.id} remains open on ${comment.sectionId}.`,
        "Resolve blocking availability comments before final manuscript export.",
        [comment.id, comment.sectionId]
      );
    }
  }

  for (const change of project.editorState.pendingChanges) {
    if (change.status !== "merged") {
      addFinding(
        findings,
        "medium",
        "availability-change-unmerged",
        `Pending change ${change.id} in ${change.sectionId} has not been merged.`,
        "Merge, reject, or explicitly defer the collaborative availability edit before export.",
        [change.id, change.sectionId]
      );
    }
  }

  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0));

  return { findings, severitySummary, score };
}

function decisionFromEvaluation(evaluation) {
  if (evaluation.severitySummary.critical > 0) {
    return "block-export-until-availability-evidence-is-clean";
  }
  if (evaluation.score < 75 || evaluation.severitySummary.high > 0) {
    return "hold-export-for-availability-review";
  }
  if (evaluation.score < 90) {
    return "manual-review-before-export";
  }
  return "availability-statement-ready";
}

function buildReviewerActions(findings) {
  return findings.map((finding) => ({
    priority: finding.severity === "critical" || finding.severity === "high" ? "blocking" : "review",
    rule: finding.rule,
    action: finding.action,
    refs: finding.refs
  }));
}

function buildReviewPacket(project) {
  const evaluation = evaluateStatementReadiness(project);
  return {
    guard: "collaborative-data-availability-statement-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#12",
    manuscriptId: project.manuscript.id,
    title: project.manuscript.title,
    targetJournal: project.manuscript.targetJournal,
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    reviewerActions: buildReviewerActions(evaluation.findings),
    safety: [
      "Synthetic manuscript, repository, collaborator, and review data only",
      "No GitHub, Zenodo, journal, identity, storage, or email network calls",
      "No private manuscript content, human-subject records, credentials, or live export mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Collaborative Data Availability Statement Guard",
    "",
    `Manuscript: ${packet.title}`,
    `Issue: ${packet.issue}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    "",
    "## Severity Summary",
    "",
    "| Severity | Count |",
    "| --- | ---: |"
  ];

  for (const severity of ["critical", "high", "medium", "low"]) {
    lines.push(`| ${severity} | ${packet.severitySummary[severity]} |`);
  }

  lines.push("", "## Findings", "");
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Refs: ${finding.refs.join(", ") || "none"}`);
  }

  lines.push("", "## Safety", "");
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const barWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  const totalFindings = packet.findings.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Collaborative data availability statement guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Data Availability Statement Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">${packet.title}</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Findings ${totalFindings} | Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Export readiness score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${barWidth}" height="14" rx="7" fill="#2563eb"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#eff6ff" stroke="#93c5fd"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#1e3a8a">Collaborative editor export checkpoint</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#1e3a8a">Validates sections, repository IDs, licenses, reviewer links, approvals, comments, and pending edits.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  decisionFromEvaluation,
  evaluateStatementReadiness,
  renderMarkdownReport,
  renderSvgSummary
};
