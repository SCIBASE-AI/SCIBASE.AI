"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];
const GENERIC_ALT_PATTERN = /\b(image|picture|photo|graph|chart|table|figure)\s+(of|showing)\b/i;
const PRIVATE_PATH_PATTERN = /\b(?:\/Users\/|C:\\Users\\|private\/|reviewer-only|blind-review|internal-note|phi:|patient-id)\b/i;
const REVIEWER_ID_PATTERN = /\b(?:reviewer\s*[a-z]?\s*#?\d+|dr\.\s+[a-z]+|anonymous\s+reviewer\s+[a-z]?)\b/i;
const COLOR_ONLY_PATTERN = /\b(red|green|blue|yellow|orange|purple|cyan|magenta)\s+(means|indicates|denotes|shows)\b/i;

function evaluateAccessibleExportPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateAccessibleExportPacket expects a packet object");
  }

  const minAltWords = options.minAltWords ?? 8;
  const now = options.now ?? new Date().toISOString();
  const findings = [];
  const document = isPlainObject(packet.document) ? packet.document : {};
  const artifacts = asArray(packet.artifacts);
  const comments = asArray(packet.comments);
  const approvals = asArray(packet.accessibilityApprovals);
  const sections = new Map(asArray(packet.sections).map((section) => [String(section.id), section]));

  if (!document.id || !document.title) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_DOCUMENT",
        "high",
        "Accessible export packet is missing a document id or title.",
        "Document metadata anchors the export audit and reviewer packet.",
        "document",
        "Include stable manuscript metadata before running the export guard."
      )
    );
  }

  if (artifacts.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_ARTIFACTS",
        "high",
        "Accessible export packet has no figures or tables to inspect.",
        "The guard cannot prove content accessibility without export artifacts.",
        "artifacts",
        "Attach the exportable figure and table inventory."
      )
    );
  }

  artifacts.forEach((artifact, index) => {
    const path = `artifacts[${index}]`;
    const id = String(artifact.id ?? "");
    const type = String(artifact.type ?? "artifact");
    const caption = String(artifact.caption ?? "");
    const altText = String(artifact.altText ?? "");
    const longDescription = String(artifact.longDescription ?? "");
    const section = sections.get(String(artifact.sectionId ?? ""));
    const relatedComments = comments.filter((comment) => String(comment.artifactId) === id);
    const artifactApprovals = approvals.filter((approval) => String(approval.artifactId) === id);

    if (!id) {
      findings.push(
        finding(
          "ARTIFACT_MISSING_ID",
          "high",
          `A ${type} is missing a stable artifact id.`,
          "Reviewer comments, locks, and accessibility approvals need a stable target.",
          `${path}.id`,
          "Assign a stable id before export."
        )
      );
    }

    if (!section) {
      findings.push(
        finding(
          "UNKNOWN_SECTION",
          "high",
          `Artifact ${id || index} points at an unknown section.`,
          "Section-scoped locks and blinded-review visibility cannot be enforced.",
          `${path}.sectionId`,
          "Bind each artifact to a known manuscript section."
        )
      );
    }

    if (artifact.exportable === false) {
      return;
    }

    if (!caption.trim()) {
      findings.push(
        finding(
          "MISSING_CAPTION",
          "high",
          `Exportable ${type} ${id || index} has no caption.`,
          "Captions are required for scientific navigation and cross-reference context.",
          `${path}.caption`,
          "Add a concise caption before export."
        )
      );
    }

    if (!altText.trim()) {
      findings.push(
        finding(
          "MISSING_ALT_TEXT",
          "high",
          `Exportable ${type} ${id || index} has no alt text.`,
          "Screen-reader users cannot understand the artifact in the exported manuscript.",
          `${path}.altText`,
          "Add outcome-focused alt text that summarizes the scientific takeaway."
        )
      );
    } else {
      const words = countWords(altText);
      if (words < minAltWords || GENERIC_ALT_PATTERN.test(altText)) {
        findings.push(
          finding(
            "THIN_OR_GENERIC_ALT_TEXT",
            "warning",
            `Alt text for ${id || type} is too thin or generic.`,
            `Detected ${words} words and ${GENERIC_ALT_PATTERN.test(altText) ? "generic visual phrasing" : "too little detail"}.`,
            `${path}.altText`,
            "Describe the key variables, trend, and scientific conclusion without relying on sight."
          )
        );
      }

      if (normalize(altText) === normalize(caption)) {
        findings.push(
          finding(
            "ALT_TEXT_DUPLICATES_CAPTION",
            "warning",
            `Alt text for ${id || type} duplicates the caption.`,
            "Captions and alt text serve different accessibility needs.",
            `${path}.altText`,
            "Keep the caption bibliographic and make the alt text describe the non-visual takeaway."
          )
        );
      }

      collectSensitiveLeaks(altText).forEach((leak) => {
        findings.push(
          finding(
            leak.code,
            "critical",
            `Alt text for ${id || type} exposes ${leak.label}.`,
            "Accessible exports must not leak blinded-review notes, private paths, or protected data.",
            `${path}.altText`,
            "Rewrite the alt text using public manuscript language only."
          )
        );
      });
    }

    if (isComplexVisual(artifact) && !longDescription.trim() && !artifact.dataSummary) {
      findings.push(
        finding(
          "COMPLEX_VISUAL_NEEDS_LONG_DESCRIPTION",
          "high",
          `Complex ${type} ${id || index} lacks a long description or data summary.`,
          "Dense scientific visualizations need a structured non-visual explanation.",
          `${path}.longDescription`,
          "Add a long description or machine-readable data summary for complex figures."
        )
      );
    }

    const usesColorChannel = asArray(artifact.visualChannels)
      .map((channel) => String(channel).toLowerCase())
      .includes("color");
    if ((COLOR_ONLY_PATTERN.test(`${altText} ${caption}`) || usesColorChannel) && !artifact.nonColorEncoding) {
      findings.push(
        finding(
          "COLOR_ONLY_ENCODING",
          "high",
          `Artifact ${id || index} relies on color-only interpretation.`,
          "Color-only distinctions are not accessible to all readers or output formats.",
          path,
          "Add shape, pattern, label, or textual encoding alongside color."
        )
      );
    }

    if (type === "table") {
      evaluateTableArtifact(artifact, path, findings);
    }

    if (artifact.sourceHash && artifact.altTextSourceHash && artifact.sourceHash !== artifact.altTextSourceHash) {
      findings.push(
        finding(
          "ALT_TEXT_STALE_SOURCE_HASH",
          "high",
          `Alt text for ${id || type} was reviewed against an older source artifact.`,
          `Expected source hash ${artifact.sourceHash}; found ${artifact.altTextSourceHash}.`,
          `${path}.altTextSourceHash`,
          "Regenerate or re-approve alt text after the source data or rendering changes."
        )
      );
    }

    if (artifact.updatedAt && artifact.altTextReviewedAt && compareIso(artifact.updatedAt, artifact.altTextReviewedAt) > 0) {
      findings.push(
        finding(
          "ALT_TEXT_REVIEW_STALE",
          "high",
          `Alt text for ${id || type} predates the latest artifact edit.`,
          `Artifact updated at ${artifact.updatedAt}; alt text reviewed at ${artifact.altTextReviewedAt}.`,
          `${path}.altTextReviewedAt`,
          "Re-review alt text after collaborative edits."
        )
      );
    }

    relatedComments
      .filter((comment) => comment.status !== "resolved" && comment.blocking === true)
      .forEach((comment) => {
        findings.push(
          finding(
            "UNRESOLVED_ACCESSIBILITY_COMMENT",
            "high",
            `Blocking accessibility comment remains open on ${id || type}.`,
            String(comment.summary ?? "An unresolved comment blocks accessible export."),
            `comments.${comment.id ?? id}`,
            "Resolve or explicitly waive blocking accessibility comments before export."
          )
        );
      });

    if (section && section.locked === true && artifact.altTextChangedInLock === true) {
      const hasLockApproval = artifactApprovals.some((approval) => approval.scope === "locked-section-alt-text" && approval.status === "approved");
      if (!hasLockApproval) {
        findings.push(
          finding(
            "LOCKED_SECTION_ALT_TEXT_UNAPPROVED",
            "high",
            `Alt text changed inside locked section ${section.id} without approval.`,
            "Final review locks should protect export wording for scientific artifacts.",
            `${path}.altTextChangedInLock`,
            "Collect a locked-section accessibility approval or reopen the section for review."
          )
        );
      }
    }

    if (!artifactApprovals.some((approval) => approval.scope === "accessible-export" && approval.status === "approved")) {
      findings.push(
        finding(
          "MISSING_ACCESSIBLE_EXPORT_APPROVAL",
          "warning",
          `Artifact ${id || index} has no accessible-export approval.`,
          "A reviewer sign-off makes export readiness auditable.",
          "accessibilityApprovals",
          "Record accessibility review approval after alt text and descriptions are current."
        )
      );
    }
  });

  const summary = summarizeFindings(findings);
  const decision = decide(summary);

  return {
    guard: "collaborative-alt-text-export-guard",
    evaluatedAt: now,
    document: {
      id: document.id ?? null,
      title: document.title ?? null,
      exportFormat: document.exportFormat ?? "unknown"
    },
    artifactCount: artifacts.length,
    decision,
    exportAllowed: decision === "export_ready",
    summary,
    findings,
    digest: digest({ document, artifacts, comments, approvals })
  };
}

function evaluateTableArtifact(artifact, path, findings) {
  const columns = asArray(artifact.columns);
  if (columns.length === 0) {
    findings.push(
      finding(
        "TABLE_MISSING_COLUMNS",
        "high",
        `Table ${artifact.id ?? "(unknown)"} has no column metadata.`,
        "Accessible table exports need headers and cell relationships.",
        `${path}.columns`,
        "Attach column ids, labels, and header scope metadata."
      )
    );
    return;
  }

  columns.forEach((column, index) => {
    if (!column.header || !column.scope) {
      findings.push(
        finding(
          "TABLE_HEADER_SCOPE_MISSING",
          "high",
          `Table ${artifact.id ?? "(unknown)"} column ${index + 1} lacks header or scope metadata.`,
          "Screen readers depend on explicit header scope for scientific tables.",
          `${path}.columns[${index}]`,
          "Add header text and row/column scope metadata."
        )
      );
    }
  });

  if (!artifact.tableSummary) {
    findings.push(
      finding(
        "TABLE_SUMMARY_MISSING",
        "warning",
        `Table ${artifact.id ?? "(unknown)"} has no concise table summary.`,
        "A summary helps readers understand table purpose before navigating cells.",
        `${path}.tableSummary`,
        "Add a short table summary that names rows, columns, units, and main comparison."
      )
    );
  }
}

function isComplexVisual(artifact) {
  if (artifact.requiresLongDescription === true) return true;
  const channels = asArray(artifact.visualChannels);
  const panels = Number(artifact.panelCount ?? 1);
  const type = String(artifact.visualization ?? "");
  return panels > 1 || channels.length > 2 || /heatmap|network|multi[-\s]?panel|microscopy|flow|survival/i.test(type);
}

function collectSensitiveLeaks(text) {
  const leaks = [];
  if (PRIVATE_PATH_PATTERN.test(text)) {
    leaks.push({ code: "PRIVATE_PATH_OR_DATA_LEAK", label: "private path or protected data marker" });
  }
  if (REVIEWER_ID_PATTERN.test(text)) {
    leaks.push({ code: "REVIEWER_IDENTITY_LEAK", label: "reviewer identity material" });
  }
  return leaks;
}

function renderMarkdownReport(result) {
  const lines = [
    "# Collaborative Alt Text Export Guard",
    "",
    `- Document: ${result.document.title ?? "(untitled)"}`,
    `- Decision: ${result.decision}`,
    `- Export allowed: ${result.exportAllowed ? "yes" : "no"}`,
    `- Findings: ${result.findings.length}`,
    `- Digest: ${result.digest}`,
    "",
    "## Summary",
    "",
    `- Critical: ${result.summary.critical}`,
    `- High: ${result.summary.high}`,
    `- Warning: ${result.summary.warning}`,
    `- Info: ${result.summary.info}`,
    "",
    "## Findings"
  ];

  if (result.findings.length === 0) {
    lines.push("", "No accessibility export blockers detected.");
  } else {
    result.findings.forEach((item, index) => {
      lines.push(
        "",
        `### ${index + 1}. ${item.code}`,
        "",
        `- Severity: ${item.severity}`,
        `- Path: ${item.path}`,
        `- Message: ${item.message}`,
        `- Evidence: ${item.evidence}`,
        `- Remediation: ${item.remediation}`
      );
    });
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const width = 960;
  const height = 540;
  const color = result.decision === "export_ready" ? "#16794c" : result.decision === "revise_before_export" ? "#a15c00" : "#a11b32";
  const title = escapeXml(result.document.title ?? "Untitled manuscript");
  const decision = escapeXml(result.decision);
  const digestShort = escapeXml(result.digest.slice(0, 16));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Collaborative alt text export guard summary</title>
  <desc id="desc">Decision ${decision} for ${title}</desc>
  <rect width="${width}" height="${height}" fill="#111827"/>
  <rect x="48" y="48" width="864" height="444" rx="24" fill="#f8fafc"/>
  <text x="80" y="112" fill="#111827" font-family="Arial, sans-serif" font-size="34" font-weight="700">Accessible Export Guard</text>
  <text x="80" y="158" fill="#334155" font-family="Arial, sans-serif" font-size="20">${title}</text>
  <rect x="80" y="198" width="360" height="82" rx="16" fill="${color}"/>
  <text x="104" y="248" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700">${decision}</text>
  <g font-family="Arial, sans-serif" font-size="24" fill="#111827">
    <text x="80" y="338">Critical: ${result.summary.critical}</text>
    <text x="300" y="338">High: ${result.summary.high}</text>
    <text x="480" y="338">Warning: ${result.summary.warning}</text>
    <text x="700" y="338">Info: ${result.summary.info}</text>
  </g>
  <text x="80" y="420" fill="#475569" font-family="Arial, sans-serif" font-size="18">Digest: ${digestShort}</text>
</svg>
`;
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function decide(summary) {
  if (summary.critical > 0) return "hold_accessible_export";
  if (summary.high > 0) return "revise_before_export";
  return "export_ready";
}

function summarizeFindings(findings) {
  const summary = { critical: 0, high: 0, warning: 0, info: 0 };
  findings.forEach((item) => {
    summary[item.severity] += 1;
  });
  return summary;
}

function finding(code, severity, message, evidence, path, remediation) {
  if (!SEVERITY_ORDER.includes(severity)) {
    throw new Error(`Unknown severity: ${severity}`);
  }
  return { code, severity, message, evidence, path, remediation };
}

function countWords(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compareIso(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateAccessibleExportPacket,
  renderMarkdownReport,
  renderSvgSummary,
  digest
};
