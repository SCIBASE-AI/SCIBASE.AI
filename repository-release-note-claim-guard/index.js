const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

const REQUIRED_EVIDENCE_BY_CLAIM = {
  analysis: ["test", "reproduction"],
  api: ["test", "export"],
  breaking_change: ["review", "export"],
  citation: ["citation", "export"],
  code: ["test"],
  dataset: ["data-diff", "checksum"],
  figure: ["reproduction", "checksum"],
  metadata: ["metadata", "export"],
  performance: ["benchmark"],
  reproducibility: ["reproduction"]
};

const HIGH_RISK_WORDING = [
  { pattern: /\bfully reproducible\b/i, code: "REPRODUCIBILITY_OVERCLAIM", kind: "reproduction" },
  { pattern: /\ball results\b/i, code: "ALL_RESULTS_OVERCLAIM", kind: "reproduction" },
  { pattern: /\bvalidated\b/i, code: "VALIDATION_OVERCLAIM", kind: "test" },
  { pattern: /\bno breaking changes?\b/i, code: "NO_BREAKING_CHANGE_OVERCLAIM", kind: "review" }
];

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function dateAgeDays(reviewedAt, producedAt) {
  const reviewed = new Date(reviewedAt);
  const produced = new Date(producedAt);
  if (Number.isNaN(reviewed.valueOf()) || Number.isNaN(produced.valueOf())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.ceil((reviewed.valueOf() - produced.valueOf()) / DAY_MS));
}

function pathMatches(path, coveredPath) {
  const left = normalizePath(path);
  const right = normalizePath(coveredPath);
  if (!left || !right) {
    return false;
  }
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`)
  );
}

function buildMaps(packet) {
  const changes = asArray(packet.changeSet).map((change) => ({
    ...change,
    path: normalizePath(change.path)
  }));
  const notes = asArray(packet.releaseNotes).map((note) => ({
    ...note,
    componentPaths: asArray(note.componentPaths).map(normalizePath),
    evidenceIds: asArray(note.evidenceIds)
  }));
  const evidence = asArray(packet.evidence).map((item) => ({
    ...item,
    coversPaths: asArray(item.coversPaths).map(normalizePath)
  }));

  return {
    changes,
    notes,
    evidence,
    noteById: new Map(notes.map((note) => [note.id, note])),
    evidenceById: new Map(evidence.map((item) => [item.id, item]))
  };
}

function evidenceCoversPath(evidence, path) {
  return asArray(evidence.coversPaths).some((coveredPath) => pathMatches(path, coveredPath));
}

function noteMentionsChange(note, change) {
  return (
    asArray(change.noteIds).includes(note.id) ||
    asArray(note.componentPaths).some((path) => pathMatches(change.path, path))
  );
}

function hasKind(noteEvidence, kind) {
  return noteEvidence.some((item) => item && item.kind === kind && item.status === "passed");
}

function addFinding(findings, severity, code, message, refs, action) {
  findings.push({
    severity,
    code,
    message,
    refs: asArray(refs),
    action
  });
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function evaluateReleasePacket(packet, options = {}) {
  const reviewedAt = options.reviewedAt || packet.reviewedAt || new Date().toISOString();
  const policy = {
    maxEvidenceAgeDays: 45,
    requireExportManifest: true,
    ...packet.policy,
    ...options.policy
  };
  const { changes, notes, evidence, noteById, evidenceById } = buildMaps(packet);
  const findings = [];
  const evidenceCoverage = [];

  for (const note of notes) {
    if (!note.id) {
      addFinding(
        findings,
        "high",
        "RELEASE_NOTE_MISSING_ID",
        "A public release-note claim is missing a stable note id.",
        [],
        "assign_release_note_id"
      );
      continue;
    }

    if (!String(note.text || "").trim()) {
      addFinding(
        findings,
        "high",
        "RELEASE_NOTE_EMPTY_TEXT",
        `Release note ${note.id} has no reviewer-visible claim text.`,
        [note.id],
        "write_public_release_note_claim"
      );
    }

    if (note.componentPaths.length === 0) {
      addFinding(
        findings,
        "medium",
        "RELEASE_NOTE_UNSCOPED",
        `Release note ${note.id} is not scoped to repository components or paths.`,
        [note.id],
        "bind_claim_to_changed_components"
      );
    }

    const noteChanges = changes.filter((change) => noteMentionsChange(note, change));
    for (const componentPath of note.componentPaths) {
      if (!changes.some((change) => pathMatches(change.path, componentPath))) {
        addFinding(
          findings,
          "high",
          "CLAIMED_COMPONENT_WITHOUT_CHANGE",
          `Release note ${note.id} names ${componentPath}, but the release packet has no matching changed artifact.`,
          [note.id, componentPath],
          "remove_claim_or_attach_changed_artifact"
        );
      }
    }

    const noteEvidence = note.evidenceIds.map((id) => evidenceById.get(id));
    for (const evidenceId of note.evidenceIds) {
      const item = evidenceById.get(evidenceId);
      if (!item) {
        addFinding(
          findings,
          "high",
          "CLAIM_EVIDENCE_MISSING",
          `Release note ${note.id} references missing evidence ${evidenceId}.`,
          [note.id, evidenceId],
          "attach_evidence_or_remove_claim"
        );
        continue;
      }

      const age = dateAgeDays(reviewedAt, item.producedAt);
      if (age > policy.maxEvidenceAgeDays) {
        addFinding(
          findings,
          "medium",
          "CLAIM_EVIDENCE_STALE",
          `Evidence ${item.id} for release note ${note.id} is ${age} days old.`,
          [note.id, item.id],
          "refresh_release_evidence"
        );
      }

      if (item.status !== "passed") {
        addFinding(
          findings,
          "high",
          "CLAIM_EVIDENCE_NOT_PASSED",
          `Evidence ${item.id} for release note ${note.id} has status ${item.status || "unknown"}.`,
          [note.id, item.id],
          "replace_or_rerun_failed_evidence"
        );
      }
    }

    const requiredKinds = REQUIRED_EVIDENCE_BY_CLAIM[note.claimType] || ["review"];
    for (const kind of requiredKinds) {
      if (!hasKind(noteEvidence, kind)) {
        addFinding(
          findings,
          "high",
          "CLAIM_KIND_EVIDENCE_MISSING",
          `Release note ${note.id} is a ${note.claimType || "general"} claim but lacks passed ${kind} evidence.`,
          [note.id, kind],
          "attach_required_claim_evidence"
        );
      }
    }

    for (const componentPath of note.componentPaths) {
      const covered = noteEvidence.some((item) => item && item.status === "passed" && evidenceCoversPath(item, componentPath));
      if (!covered) {
        addFinding(
          findings,
          "medium",
          "CLAIM_PATH_NOT_COVERED_BY_EVIDENCE",
          `Release note ${note.id} cites ${componentPath}, but no passed evidence covers that path.`,
          [note.id, componentPath],
          "add_path_specific_release_evidence"
        );
      }
    }

    for (const wording of HIGH_RISK_WORDING) {
      if (wording.pattern.test(note.text || "") && !hasKind(noteEvidence, wording.kind)) {
        addFinding(
          findings,
          "high",
          wording.code,
          `Release note ${note.id} uses high-confidence wording without passed ${wording.kind} evidence.`,
          [note.id],
          "downgrade_claim_or_add_evidence"
        );
      }
    }

    if (/no breaking changes?/i.test(note.text || "")) {
      const breakingChanges = changes.filter((change) => change.breaking === true);
      if (breakingChanges.length > 0) {
        addFinding(
          findings,
          "critical",
          "NO_BREAKING_CHANGE_CONFLICT",
          `Release note ${note.id} says there are no breaking changes, but ${breakingChanges.length} changed artifact(s) are marked breaking.`,
          [note.id, ...breakingChanges.map((change) => change.id || change.path)],
          "remove_no_breaking_claim_or_document_breaking_change"
        );
      }
    }

    evidenceCoverage.push({
      noteId: note.id,
      claimType: note.claimType || "general",
      changedArtifacts: noteChanges.length,
      evidenceIds: note.evidenceIds,
      passedEvidence: noteEvidence.filter((item) => item && item.status === "passed").length,
      requiredKinds
    });
  }

  for (const change of changes) {
    const mentions = notes.filter((note) => noteMentionsChange(note, change));
    if (mentions.length === 0 && change.publicImpact !== false) {
      addFinding(
        findings,
        change.breaking ? "high" : "medium",
        "CHANGED_ARTIFACT_UNMENTIONED",
        `Changed artifact ${change.path} is not represented in any public release note.`,
        [change.id || change.path],
        "add_release_note_or_mark_internal_only"
      );
    }

    if (!change.digestAfter || change.digestBefore === change.digestAfter) {
      addFinding(
        findings,
        "medium",
        "CHANGE_DIGEST_NOT_UPDATED",
        `Changed artifact ${change.path} does not carry a new post-release digest.`,
        [change.id || change.path],
        "record_post_release_digest"
      );
    }

    if (change.breaking && !notes.some((note) => note.claimType === "breaking_change" && noteMentionsChange(note, change))) {
      addFinding(
        findings,
        "high",
        "BREAKING_CHANGE_NOT_DISCLOSED",
        `Breaking artifact ${change.path} has no explicit breaking-change release note.`,
        [change.id || change.path],
        "document_breaking_change_in_release_notes"
      );
    }
  }

  const manifest = packet.exportManifest || {};
  if (policy.requireExportManifest && !packet.exportManifest) {
    addFinding(
      findings,
      "high",
      "EXPORT_MANIFEST_MISSING",
      "The release packet has no export manifest for release-note, citation, and artifact parity checks.",
      [],
      "attach_export_manifest"
    );
  } else if (packet.exportManifest) {
    for (const note of notes) {
      if (!asArray(manifest.releaseNoteIds).includes(note.id)) {
        addFinding(
          findings,
          "medium",
          "EXPORT_MANIFEST_MISSING_RELEASE_NOTE",
          `Export manifest does not list public release note ${note.id}.`,
          [note.id],
          "add_release_note_to_export_manifest"
        );
      }
    }

    const manifestDigests = manifest.componentDigests || {};
    for (const change of changes) {
      if (change.publicImpact === false) {
        continue;
      }
      const expectedDigest = manifestDigests[change.path];
      if (expectedDigest !== change.digestAfter) {
        addFinding(
          findings,
          "high",
          "EXPORT_DIGEST_MISMATCH",
          `Export manifest digest for ${change.path} does not match the changed artifact digest.`,
          [change.path],
          "update_export_manifest_digest"
        );
      }
    }

    if (manifest.versionTag && packet.versionTag && manifest.versionTag !== packet.versionTag) {
      addFinding(
        findings,
        "medium",
        "EXPORT_VERSION_TAG_MISMATCH",
        `Export manifest tag ${manifest.versionTag} does not match release tag ${packet.versionTag}.`,
        [manifest.versionTag, packet.versionTag],
        "align_export_manifest_version_tag"
      );
    }
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const topSeverity = findings[0] ? findings[0].severity : "none";
  const decision = findings.some((finding) => severityRank(finding.severity) >= 3)
    ? "hold_repository_release"
    : findings.some((finding) => finding.severity === "medium")
      ? "revise_release_notes"
      : "publish_release_notes";

  const summary = {
    repositoryId: packet.repositoryId,
    versionTag: packet.versionTag,
    reviewedAt,
    decision,
    topSeverity,
    releaseNotesReviewed: notes.length,
    changedArtifactsReviewed: changes.length,
    evidenceItemsReviewed: evidence.length,
    findingCount: findings.length,
    highOrCriticalFindings: findings.filter((finding) => severityRank(finding.severity) >= 3).length
  };

  const auditDigest = `sha256:${sha256({ summary, findings, evidenceCoverage }).slice(0, 16)}`;

  return {
    summary: {
      ...summary,
      auditDigest
    },
    evidenceCoverage,
    findings,
    actions: buildActions(findings)
  };
}

function buildActions(findings) {
  const actions = [];
  const seen = new Set();
  for (const finding of findings) {
    if (!finding.action || seen.has(finding.action)) {
      continue;
    }
    seen.add(finding.action);
    actions.push({
      id: finding.action,
      severity: finding.severity,
      refs: finding.refs
    });
  }
  return actions;
}

function renderMarkdownReport(packet, evaluation) {
  const lines = [];
  lines.push(`# Release Note Claim Evidence Review: ${packet.versionTag}`);
  lines.push("");
  lines.push(`Decision: **${evaluation.summary.decision}**`);
  lines.push(`Audit digest: \`${evaluation.summary.auditDigest}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| Release notes reviewed | ${evaluation.summary.releaseNotesReviewed} |`);
  lines.push(`| Changed artifacts reviewed | ${evaluation.summary.changedArtifactsReviewed} |`);
  lines.push(`| Evidence items reviewed | ${evaluation.summary.evidenceItemsReviewed} |`);
  lines.push(`| Findings | ${evaluation.summary.findingCount} |`);
  lines.push(`| High or critical findings | ${evaluation.summary.highOrCriticalFindings} |`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (evaluation.findings.length === 0) {
    lines.push("No release-blocking findings were detected.");
  } else {
    lines.push("| Severity | Code | Message | Action |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of evaluation.findings) {
      lines.push(
        `| ${finding.severity} | \`${finding.code}\` | ${escapeMarkdown(finding.message)} | \`${finding.action}\` |`
      );
    }
  }
  lines.push("");
  lines.push("## Evidence Coverage");
  lines.push("");
  lines.push("| Release note | Claim type | Changed artifacts | Passed evidence | Required evidence |");
  lines.push("| --- | --- | ---: | ---: | --- |");
  for (const item of evaluation.evidenceCoverage) {
    lines.push(
      `| ${item.noteId} | ${item.claimType} | ${item.changedArtifacts} | ${item.passedEvidence} | ${item.requiredKinds.join(", ")} |`
    );
  }
  lines.push("");
  lines.push("Synthetic data only. No Git provider, DOI provider, CI system, private repository, payment account, credential, or external API is contacted.");
  return `${lines.join("\n")}\n`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderSvgSummary(evaluation) {
  const isHold = evaluation.summary.decision === "hold_repository_release";
  const color = isHold ? "#b91c1c" : evaluation.summary.decision === "revise_release_notes" ? "#b45309" : "#047857";
  const safeDecision = escapeXml(evaluation.summary.decision);
  const safeDigest = escapeXml(evaluation.summary.auditDigest);
  const findings = evaluation.findings.slice(0, 5);
  const rows = findings.map((finding, index) => {
    const y = 205 + index * 42;
    return `<text x="72" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#111827">${escapeXml(finding.severity.toUpperCase())} ${escapeXml(finding.code)}</text>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Release note claim evidence guard summary">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="72" y="104" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#111827">Repository Release Note Claim Guard</text>
  <rect x="72" y="132" width="520" height="56" rx="10" fill="${color}"/>
  <text x="96" y="169" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${safeDecision}</text>
  <text x="72" y="230" font-family="Arial, sans-serif" font-size="24" fill="#374151">Findings: ${evaluation.summary.findingCount}</text>
  <text x="72" y="270" font-family="Arial, sans-serif" font-size="24" fill="#374151">High or critical: ${evaluation.summary.highOrCriticalFindings}</text>
  <text x="72" y="310" font-family="Arial, sans-serif" font-size="24" fill="#374151">Audit digest: ${safeDigest}</text>
  <line x1="72" y1="342" x2="1208" y2="342" stroke="#e5e7eb" stroke-width="2"/>
  <text x="72" y="388" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#111827">Top Findings</text>
  <g transform="translate(0, 230)">
${rows || '<text x="72" y="205" font-family="Arial, sans-serif" font-size="22" fill="#047857">No findings detected.</text>'}
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  REQUIRED_EVIDENCE_BY_CLAIM,
  evaluateReleasePacket,
  renderMarkdownReport,
  renderSvgSummary,
  sha256
};
