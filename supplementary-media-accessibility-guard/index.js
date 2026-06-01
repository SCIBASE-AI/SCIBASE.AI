const crypto = require("node:crypto");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
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

function evaluateMediaPacket(packet) {
  const findings = [];
  const releaseDate = packet.releaseDate || new Date().toISOString().slice(0, 10);
  const artifacts = asArray(packet.mediaArtifacts);
  const coverage = [];

  for (const artifact of artifacts) {
    const refs = [artifact.id || "media-artifact"];
    const type = artifact.type || "unknown";
    const requiresAlt = ["image", "figure_panel", "thumbnail", "microscopy_image"].includes(type);
    const requiresTranscript = ["video", "microscopy_clip", "protocol_video"].includes(type);
    const altText = String(artifact.altText || "").trim();
    const caption = String(artifact.caption || "").trim();
    const transcriptSegments = asArray(artifact.transcriptSegments);
    const metadata = artifact.accessibilityMetadata || {};

    if (requiresAlt && altText.length < 24) {
      addFinding(
        findings,
        "high",
        "ALT_TEXT_MISSING_OR_TOO_SHORT",
        `${artifact.id || "media"} needs descriptive alt text before public preview.`,
        refs,
        "add_descriptive_alt_text"
      );
    }

    if (caption.length < 24) {
      addFinding(
        findings,
        "medium",
        "CAPTION_MISSING_OR_TOO_SHORT",
        `${artifact.id || "media"} needs a reviewer-facing caption for preview and export packets.`,
        refs,
        "add_reviewer_caption"
      );
    }

    if (requiresTranscript) {
      const transcriptCoverage = coveredSeconds(transcriptSegments, Number(artifact.durationSeconds || 0));
      if (transcriptCoverage < 0.9) {
        addFinding(
          findings,
          "high",
          "TRANSCRIPT_COVERAGE_INCOMPLETE",
          `${artifact.id || "video"} has ${(transcriptCoverage * 100).toFixed(0)}% transcript coverage.`,
          refs,
          "complete_timecoded_transcript"
        );
      }
      const unlabeledSegments = transcriptSegments.filter((segment) => !String(segment.label || "").trim());
      if (unlabeledSegments.length > 0) {
        addFinding(
          findings,
          "medium",
          "TIMECODE_LABEL_MISSING",
          `${artifact.id || "video"} has ${unlabeledSegments.length} transcript segments without scientific labels.`,
          refs,
          "label_transcript_segments"
        );
      }
    }

    if (artifact.publicPreview === true && artifact.embargoUntil) {
      const daysRemaining = daysBetween(artifact.embargoUntil, releaseDate);
      if (daysRemaining !== null && daysRemaining > 0) {
        addFinding(
          findings,
          "critical",
          "EMBARGOED_MEDIA_PUBLIC_PREVIEW",
          `${artifact.id || "media"} is previewable while embargoed for ${daysRemaining} more days.`,
          refs,
          "hold_embargoed_media_preview"
        );
      }
    }

    if (artifact.accessState === "restricted" && artifact.publicPreview === true) {
      addFinding(
        findings,
        "critical",
        "RESTRICTED_MEDIA_PUBLIC_PREVIEW",
        `${artifact.id || "media"} is restricted but marked for public preview.`,
        refs,
        "disable_public_preview_for_restricted_media"
      );
    }

    const thumbnail = artifact.thumbnail || {};
    if (thumbnail.sourceChecksum && artifact.checksum && thumbnail.sourceChecksum !== artifact.checksum) {
      addFinding(
        findings,
        "high",
        "THUMBNAIL_PROVENANCE_DRIFT",
        `${artifact.id || "media"} thumbnail was generated from a checksum that differs from the hosted source artifact.`,
        refs,
        "regenerate_thumbnail_from_current_artifact"
      );
    }

    if (artifact.previewChecksum && artifact.checksum && artifact.previewSourceChecksum && artifact.previewSourceChecksum !== artifact.checksum) {
      addFinding(
        findings,
        "high",
        "PREVIEW_SOURCE_CHECKSUM_DRIFT",
        `${artifact.id || "media"} preview source checksum does not match the current artifact checksum.`,
        refs,
        "regenerate_preview_from_current_artifact"
      );
    }

    const requiredMetadata = [
      ["accessMode", metadata.accessMode],
      ["accessibilityFeature", metadata.accessibilityFeature],
      ["encodingFormat", metadata.encodingFormat],
      ["schemaOrgType", metadata.schemaOrgType]
    ];
    const missingMetadata = requiredMetadata.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
    if (missingMetadata.length > 0) {
      addFinding(
        findings,
        "medium",
        "ACCESSIBILITY_METADATA_INCOMPLETE",
        `${artifact.id || "media"} is missing accessibility metadata: ${missingMetadata.join(", ")}.`,
        refs,
        "complete_datacite_schema_org_accessibility_metadata"
      );
    }

    coverage.push({
      id: artifact.id,
      type,
      publicPreview: Boolean(artifact.publicPreview),
      hasAltText: altText.length >= 24,
      hasCaption: caption.length >= 24,
      transcriptCoverage: requiresTranscript ? coveredSeconds(transcriptSegments, Number(artifact.durationSeconds || 0)) : null,
      metadataComplete: missingMetadata.length === 0
    });
  }

  if (artifacts.length === 0) {
    addFinding(
      findings,
      "high",
      "MEDIA_PACKET_EMPTY",
      "No supplementary media artifacts were supplied for review.",
      [packet.projectId || "project"],
      "attach_media_artifacts_before_export"
    );
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const decision = findings.some((finding) => severityRank(finding.severity) >= 3)
    ? "hold_media_preview_release"
    : findings.some((finding) => finding.severity === "medium")
      ? "revise_media_accessibility_packet"
      : "release_media_preview_packet";

  const summary = {
    projectId: packet.projectId,
    releaseDate,
    decision,
    mediaReviewed: artifacts.length,
    findingCount: findings.length,
    highOrCriticalFindings: findings.filter((finding) => severityRank(finding.severity) >= 3).length
  };
  const auditDigest = `sha256:${sha256({ summary, findings, coverage }).slice(0, 16)}`;

  return {
    summary: {
      ...summary,
      auditDigest
    },
    coverage,
    findings,
    actions: buildActions(findings)
  };
}

function coveredSeconds(segments, durationSeconds) {
  if (!durationSeconds || durationSeconds < 1) {
    return segments.length > 0 ? 1 : 0;
  }
  const covered = asArray(segments).reduce((sum, segment) => {
    const start = Number(segment.startSeconds || 0);
    const end = Number(segment.endSeconds || 0);
    return sum + Math.max(0, Math.min(durationSeconds, end) - Math.max(0, start));
  }, 0);
  return Math.max(0, Math.min(1, covered / durationSeconds));
}

function buildActions(findings) {
  const seen = new Set();
  const actions = [];
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
  lines.push(`# Supplementary Media Accessibility Review: ${packet.projectId}`);
  lines.push("");
  lines.push(`Decision: **${evaluation.summary.decision}**`);
  lines.push(`Audit digest: \`${evaluation.summary.auditDigest}\``);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (evaluation.findings.length === 0) {
    lines.push("No supplementary media accessibility blockers were detected.");
  } else {
    lines.push("| Severity | Code | Message | Action |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of evaluation.findings) {
      lines.push(`| ${finding.severity} | \`${finding.code}\` | ${escapeMarkdown(finding.message)} | \`${finding.action}\` |`);
    }
  }
  lines.push("");
  lines.push("## Media Coverage");
  lines.push("");
  lines.push("| Artifact | Type | Public preview | Alt text | Caption | Transcript coverage | Metadata |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const item of evaluation.coverage) {
    const transcript = item.transcriptCoverage === null ? "n/a" : `${Math.round(item.transcriptCoverage * 100)}%`;
    lines.push(`| ${item.id || ""} | ${item.type} | ${item.publicPreview ? "yes" : "no"} | ${item.hasAltText ? "yes" : "no"} | ${item.hasCaption ? "yes" : "no"} | ${transcript} | ${item.metadataComplete ? "complete" : "incomplete"} |`);
  }
  lines.push("");
  lines.push("Synthetic data only. No live media stores, private projects, uploaded datasets, credential stores, payment systems, financial accounts, or external APIs are used.");
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(evaluation) {
  const color = evaluation.summary.decision === "hold_media_preview_release"
    ? "#b91c1c"
    : evaluation.summary.decision === "revise_media_accessibility_packet"
      ? "#b45309"
      : "#047857";
  const rows = evaluation.findings.slice(0, 5).map((finding, index) => {
    const y = 304 + index * 42;
    return `<text x="76" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#111827">${escapeXml(finding.severity.toUpperCase())} ${escapeXml(finding.code)}</text>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Supplementary media accessibility guard summary">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="76" y="110" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">Supplementary Media Accessibility Guard</text>
  <rect x="76" y="140" width="680" height="58" rx="10" fill="${color}"/>
  <text x="102" y="178" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(evaluation.summary.decision)}</text>
  <text x="76" y="242" font-family="Arial, sans-serif" font-size="24" fill="#374151">Media reviewed: ${evaluation.summary.mediaReviewed}</text>
  <text x="76" y="276" font-family="Arial, sans-serif" font-size="24" fill="#374151">Findings: ${evaluation.summary.findingCount}</text>
${rows || '<text x="76" y="304" font-family="Arial, sans-serif" font-size="22" fill="#047857">No findings detected.</text>'}
  <text x="76" y="642" font-family="Arial, sans-serif" font-size="20" fill="#6b7280">${escapeXml(evaluation.summary.auditDigest)}</text>
</svg>
`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateMediaPacket,
  renderMarkdownReport,
  renderSvgSummary,
  sha256
};
