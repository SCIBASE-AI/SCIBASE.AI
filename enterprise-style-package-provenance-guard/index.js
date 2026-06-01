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
  const parsed = new Date(value || "");
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

function isSemver(value) {
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(value || ""));
}

function normalizedSet(values) {
  return new Set(asArray(values).map((value) => String(value).trim().toLowerCase()).filter(Boolean));
}

function setDifference(required, actual) {
  const actualSet = normalizedSet(actual);
  return asArray(required).filter((value) => !actualSet.has(String(value).trim().toLowerCase()));
}

function evaluateStylePackage(packet) {
  const findings = [];
  const reviewDate = packet.reviewDate || new Date().toISOString().slice(0, 10);
  const stylePackages = asArray(packet.stylePackages);
  const approvedPlugins = new Map(asArray(packet.approvedPlugins).map((plugin) => [plugin.id, plugin]));
  const requiredFormats = asArray(packet.requiredExportFormats);
  const packageSummaries = [];

  if (stylePackages.length === 0) {
    addFinding(
      findings,
      "critical",
      "STYLE_PACKAGE_EMPTY",
      "No enterprise formatting style packages were supplied for export review.",
      [packet.institutionId || "institution"],
      "attach_style_packages_before_export_release"
    );
  }

  for (const stylePackage of stylePackages) {
    const refs = [stylePackage.id || "style-package"];
    const plugin = approvedPlugins.get(stylePackage.pluginId);
    const pluginVersion = String(stylePackage.pluginVersion || "");
    const target = stylePackage.target || {};

    if (!plugin) {
      addFinding(
        findings,
        "critical",
        "PLUGIN_NOT_APPROVED",
        `${stylePackage.id || "style package"} uses plugin ${stylePackage.pluginId || "unknown"} without enterprise approval.`,
        refs,
        "route_plugin_for_enterprise_approval"
      );
    }

    if (!isSemver(pluginVersion)) {
      addFinding(
        findings,
        "high",
        "PLUGIN_VERSION_NOT_PINNED",
        `${stylePackage.id || "style package"} is missing a pinned semantic plugin version.`,
        refs,
        "pin_plugin_version_before_export"
      );
    } else if (plugin && !asArray(plugin.allowedVersions).includes(pluginVersion)) {
      addFinding(
        findings,
        "high",
        "PLUGIN_VERSION_NOT_APPROVED",
        `${stylePackage.id || "style package"} uses ${pluginVersion}, which is not in the approved plugin version list.`,
        refs,
        "promote_or_replace_approved_plugin_version"
      );
    }

    const missingFormats = setDifference(requiredFormats, stylePackage.formats);
    if (missingFormats.length > 0) {
      addFinding(
        findings,
        "high",
        "EXPORT_FORMAT_COVERAGE_GAP",
        `${stylePackage.id || "style package"} is missing required export formats: ${missingFormats.join(", ")}.`,
        refs,
        "add_required_export_format_templates"
      );
    }

    const templateChecks = asArray(stylePackage.templates);
    if (templateChecks.length === 0) {
      addFinding(
        findings,
        "high",
        "TEMPLATE_MANIFEST_MISSING",
        `${stylePackage.id || "style package"} has no template checksum manifest.`,
        refs,
        "attach_template_checksum_manifest"
      );
    }

    for (const template of templateChecks) {
      if (!template.expectedChecksum || !template.actualChecksum) {
        addFinding(
          findings,
          "medium",
          "TEMPLATE_CHECKSUM_INCOMPLETE",
          `${template.path || stylePackage.id || "template"} lacks both expected and actual checksums.`,
          refs,
          "record_expected_and_actual_template_checksums"
        );
      } else if (template.expectedChecksum !== template.actualChecksum) {
        addFinding(
          findings,
          "critical",
          "TEMPLATE_CHECKSUM_DRIFT",
          `${template.path || stylePackage.id || "template"} checksum differs from the approved style package manifest.`,
          refs,
          "block_export_until_template_is_rebuilt_from_approved_source"
        );
      }
    }

    if (String(stylePackage.citationStyle || "").toLowerCase() !== String(target.citationStyle || "").toLowerCase()) {
      addFinding(
        findings,
        "high",
        "CITATION_STYLE_MISMATCH",
        `${stylePackage.id || "style package"} uses ${stylePackage.citationStyle || "unknown"} citations for ${target.name || "target"} which requires ${target.citationStyle || "unknown"}.`,
        refs,
        "select_target_approved_citation_style"
      );
    }

    const metadata = stylePackage.metadataPreservation || {};
    const missingMetadata = [
      ["DOI", metadata.doi],
      ["ORCID", metadata.orcid],
      ["version history", metadata.versionHistory],
      ["license", metadata.license],
      ["funder award", metadata.funderAward]
    ].filter(([, present]) => present !== true).map(([label]) => label);
    if (missingMetadata.length > 0) {
      addFinding(
        findings,
        "high",
        "EXPORT_METADATA_PRESERVATION_GAP",
        `${stylePackage.id || "style package"} does not preserve ${missingMetadata.join(", ")} metadata across export formats.`,
        refs,
        "preserve_required_publication_metadata"
      );
    }

    const validationAge = daysBetween(reviewDate, stylePackage.lastValidatedAt);
    if (validationAge === null || validationAge > Number(packet.maxValidationAgeDays || 90)) {
      addFinding(
        findings,
        "medium",
        "STYLE_VALIDATION_STALE",
        `${stylePackage.id || "style package"} style validation is ${validationAge === null ? "missing" : `${validationAge} days old`}.`,
        refs,
        "rerun_style_export_validation"
      );
    }

    const signoff = stylePackage.reviewerSignoff || {};
    if (!signoff.reviewer || signoff.status !== "approved") {
      addFinding(
        findings,
        "high",
        "STYLE_SIGNOFF_MISSING",
        `${stylePackage.id || "style package"} lacks approved enterprise reviewer signoff.`,
        refs,
        "obtain_enterprise_style_reviewer_signoff"
      );
    }

    const generatedOutputs = asArray(stylePackage.generatedOutputs);
    const missingOutputDigest = generatedOutputs.filter((output) => !output.provenanceDigest || !output.builtFromTemplateChecksum);
    if (missingOutputDigest.length > 0) {
      addFinding(
        findings,
        "medium",
        "OUTPUT_PROVENANCE_DIGEST_MISSING",
        `${stylePackage.id || "style package"} has ${missingOutputDigest.length} generated outputs without build provenance digests.`,
        refs,
        "record_output_build_provenance_digests"
      );
    }

    if (asArray(stylePackage.previewFields).some((field) => field.private === true && field.exported === true)) {
      addFinding(
        findings,
        "critical",
        "PRIVATE_FIELD_EXPORTED_IN_STYLE_PREVIEW",
        `${stylePackage.id || "style package"} exports private internal style-preview fields.`,
        refs,
        "remove_private_preview_fields_from_export"
      );
    }

    packageSummaries.push({
      id: stylePackage.id,
      pluginId: stylePackage.pluginId,
      pluginVersion,
      target: target.name,
      formatCount: asArray(stylePackage.formats).length,
      templateCount: templateChecks.length,
      validationAgeDays: validationAge,
      outputCount: generatedOutputs.length
    });
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const decision = findings.some((finding) => severityRank(finding.severity) >= 4)
    ? "hold_enterprise_style_exports"
    : findings.some((finding) => severityRank(finding.severity) >= 3)
      ? "revise_style_package_before_export"
      : findings.some((finding) => finding.severity === "medium")
        ? "release_after_style_validation_refresh"
        : "release_enterprise_style_exports";

  const summary = {
    institutionId: packet.institutionId,
    reviewDate,
    decision,
    stylePackagesReviewed: stylePackages.length,
    findingCount: findings.length,
    highOrCriticalFindings: findings.filter((finding) => severityRank(finding.severity) >= 3).length
  };
  const auditDigest = `sha256:${sha256({ summary, findings, packageSummaries }).slice(0, 16)}`;

  return {
    summary: {
      ...summary,
      auditDigest
    },
    findings,
    packageSummaries,
    requiredExportFormats: requiredFormats
  };
}

function renderMarkdownReport(packet, evaluation) {
  const lines = [
    `# Enterprise Style Package Provenance Report`,
    "",
    `Institution: ${packet.institutionId}`,
    `Review date: ${evaluation.summary.reviewDate}`,
    `Decision: ${evaluation.summary.decision}`,
    `Audit digest: ${evaluation.summary.auditDigest}`,
    "",
    "## Style Packages",
    "",
    "| Package | Target | Plugin | Formats | Templates | Validation age |",
    "| --- | --- | --- | ---: | ---: | ---: |"
  ];

  for (const item of evaluation.packageSummaries) {
    lines.push(`| ${item.id} | ${item.target || "unknown"} | ${item.pluginId}@${item.pluginVersion || "unknown"} | ${item.formatCount} | ${item.templateCount} | ${item.validationAgeDays === null ? "missing" : `${item.validationAgeDays}d`} |`);
  }

  lines.push("", "## Findings", "");
  if (evaluation.findings.length === 0) {
    lines.push("No findings.");
  } else {
    for (const finding of evaluation.findings) {
      lines.push(`- **${finding.severity.toUpperCase()} ${finding.code}**: ${finding.message} Action: \`${finding.action}\`.`);
    }
  }

  lines.push("", "## Required Export Formats", "");
  for (const format of evaluation.requiredExportFormats) {
    lines.push(`- ${format}`);
  }
  lines.push("");
  return lines.join("\n");
}

function renderSvgSummary(evaluation) {
  const width = 920;
  const height = 420;
  const critical = evaluation.findings.filter((finding) => finding.severity === "critical").length;
  const high = evaluation.findings.filter((finding) => finding.severity === "high").length;
  const medium = evaluation.findings.filter((finding) => finding.severity === "medium").length;
  const bars = [
    ["critical", critical, "#b91c1c"],
    ["high", high, "#dc2626"],
    ["medium", medium, "#d97706"]
  ];
  const barSvg = bars.map(([label, count, color], index) => {
    const y = 150 + index * 72;
    const barWidth = Math.max(16, Math.min(520, count * 54));
    return `<text x="82" y="${y + 22}" font-size="20" fill="#1f2937">${label}</text><rect x="210" y="${y}" width="${barWidth}" height="34" rx="5" fill="${color}"/><text x="${225 + barWidth}" y="${y + 24}" font-size="18" fill="#111827">${count}</text>`;
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>`,
    `<rect x="48" y="44" width="824" height="332" rx="8" fill="#ffffff" stroke="#cbd5e1"/>`,
    `<text x="82" y="96" font-size="28" font-family="Arial, sans-serif" fill="#0f172a">Enterprise Style Package Provenance</text>`,
    `<text x="82" y="126" font-size="17" font-family="Arial, sans-serif" fill="#475569">Decision: ${evaluation.summary.decision}</text>`,
    barSvg,
    `<text x="82" y="350" font-size="15" font-family="Arial, sans-serif" fill="#475569">Audit ${evaluation.summary.auditDigest}</text>`,
    `</svg>`,
    ""
  ].join("\n");
}

module.exports = {
  evaluateStylePackage,
  renderMarkdownReport,
  renderSvgSummary,
  stableJson,
  sha256
};
