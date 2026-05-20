"use strict";

const crypto = require("crypto");

const DEFAULT_LIMITS = Object.freeze({
  maxCells: 150,
  maxNotebookBytes: 12 * 1024 * 1024,
  maxInlineOutputBytes: 512 * 1024,
  maxArtifactBytes: 250 * 1024 * 1024,
});

const SEVERITY_WEIGHT = Object.freeze({
  info: 0,
  low: 4,
  medium: 9,
  high: 18,
  critical: 35,
});

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*["']?[a-z0-9_\-]{16,}/i,
  /secret\s*[:=]\s*["']?[a-z0-9_\-]{16,}/i,
  /token\s*[:=]\s*["']?[a-z0-9_\-]{20,}/i,
  /password\s*[:=]\s*["']?[^"'\s]{8,}/i,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

function auditNotebookPreviewIntegrity(project, options = {}) {
  const input = project || {};
  const limits = Object.assign({}, DEFAULT_LIMITS, options.limits || {});
  const generatedAt = options.generatedAt || new Date().toISOString();
  const notebook = input.notebook || {};
  const cells = Array.isArray(notebook.cells) ? notebook.cells : [];
  const artifacts = Array.isArray(input.artifacts) ? input.artifacts : [];
  const metadata = input.metadata || {};
  const execution = input.execution || {};
  const checks = [];

  addCheck(checks, "notebook-present", cells.length > 0 ? "pass" : "fail", cells.length > 0 ? "info" : "critical", cells.length > 0 ? "Notebook content is available for preview." : "Notebook has no cells to preview.", {
    cellCount: cells.length,
  });

  addCheck(checks, "cell-count-budget", cells.length <= limits.maxCells ? "pass" : "fail", cells.length <= limits.maxCells ? "info" : "medium", String(cells.length) + " cells measured against preview limit " + String(limits.maxCells) + ".", {
    limit: limits.maxCells,
    cellCount: cells.length,
  });

  const notebookBytes = byteLength(JSON.stringify(notebook));
  addCheck(checks, "notebook-size-budget", notebookBytes <= limits.maxNotebookBytes ? "pass" : "fail", notebookBytes <= limits.maxNotebookBytes ? "info" : "high", "Notebook payload is " + formatBytes(notebookBytes) + ".", {
    limitBytes: limits.maxNotebookBytes,
    notebookBytes,
  });

  const previewManifest = cells.map(function summarize(cell, index) {
    return summarizeCell(cell, index, limits);
  });
  const unsafeCells = previewManifest.filter(function filterUnsafe(cell) {
    return cell.flags.includes("possible-secret") || cell.flags.includes("active-html");
  });
  addCheck(checks, "unsafe-preview-content", unsafeCells.length === 0 ? "pass" : "fail", unsafeCells.length === 0 ? "info" : "critical", unsafeCells.length === 0 ? "No secrets or active HTML were detected in previewable content." : String(unsafeCells.length) + " cell(s) need redaction before public preview.", {
    affectedCells: unsafeCells.map(function mapCell(cell) { return cell.cellIndex; }),
  });

  const oversizedCells = previewManifest.filter(function filterOversized(cell) {
    return cell.outputBytes > limits.maxInlineOutputBytes;
  });
  addCheck(checks, "inline-output-budget", oversizedCells.length === 0 ? "pass" : "warn", oversizedCells.length === 0 ? "info" : "medium", oversizedCells.length === 0 ? "All inline outputs fit within preview budget." : String(oversizedCells.length) + " output(s) should be externalized before rendering.", {
    limitBytes: limits.maxInlineOutputBytes,
    affectedCells: oversizedCells.map(function mapCell(cell) { return cell.cellIndex; }),
  });

  const executionWarnings = findExecutionOrderWarnings(previewManifest);
  addCheck(checks, "execution-order-coherence", executionWarnings.length === 0 ? "pass" : "warn", executionWarnings.length === 0 ? "info" : "medium", executionWarnings.length === 0 ? "Executed code cells have coherent ordering." : "Execution counts are missing, duplicated, or out of order.", {
    warnings: executionWarnings,
  });

  const altTextGaps = previewManifest.filter(function filterAlt(cell) {
    return cell.hasVisualOutput && !cell.hasAltText;
  });
  addCheck(checks, "visual-alt-text", altTextGaps.length === 0 ? "pass" : "warn", altTextGaps.length === 0 ? "info" : "low", altTextGaps.length === 0 ? "Visual outputs include accessible labels or alt text." : String(altTextGaps.length) + " visual output(s) need alt text before publication.", {
    affectedCells: altTextGaps.map(function mapCell(cell) { return cell.cellIndex; }),
  });

  const metadataResult = evaluateMetadata(metadata, input);
  addCheck(checks, "fair-metadata", metadataResult.missing.length === 0 ? "pass" : "warn", metadataResult.missing.length === 0 ? "info" : "high", metadataResult.missing.length === 0 ? "Required FAIR, DataCite, and schema.org metadata is present." : "Missing metadata: " + metadataResult.missing.join(", ") + ".", {
    missing: metadataResult.missing,
    present: metadataResult.present,
  });

  const artifactResult = evaluateArtifacts(artifacts, limits);
  addCheck(checks, "artifact-preview-readiness", artifactResult.failures.length === 0 ? "pass" : "warn", artifactResult.failures.length === 0 ? "info" : "medium", artifactResult.failures.length === 0 ? "Artifacts are previewable and checksum-addressed." : String(artifactResult.failures.length) + " artifact readiness issue(s) detected.", {
    failures: artifactResult.failures,
  });

  const environmentResult = evaluateEnvironment(execution.environment || notebook.environment || {});
  addCheck(checks, "execution-environment-capture", environmentResult.missing.length === 0 ? "pass" : "warn", environmentResult.missing.length === 0 ? "info" : "medium", environmentResult.missing.length === 0 ? "Kernel, runtime, dependency lock, and seed policy are captured." : "Execution environment gaps: " + environmentResult.missing.join(", ") + ".", {
    missing: environmentResult.missing,
  });

  const score = calculateScore(checks);
  const decision = decide(checks, score);
  const fairScore = calculateFairScore(metadataResult, artifactResult, environmentResult);
  const dataciteDraft = buildDataCiteDraft(metadata, input);
  const schemaOrgDataset = buildSchemaOrgDataset(metadata, input, artifacts);
  const remediationPlan = buildRemediationPlan(checks);
  const digest = stableHash({
    projectId: input.projectId,
    title: input.title,
    checks: checks.map(function mapCheck(check) {
      return {
        id: check.id,
        status: check.status,
        severity: check.severity,
        evidence: check.evidence,
      };
    }),
    previewManifest,
    dataciteDraft,
    schemaOrgDataset,
  });

  const report = {
    module: "notebook-preview-integrity-gate",
    projectId: input.projectId || "unassigned-project",
    title: input.title || "Untitled notebook package",
    generatedAt,
    decision,
    score,
    fairScore,
    digest,
    checks,
    previewManifest,
    artifactSummary: artifactResult.summary,
    dataciteDraft,
    schemaOrgDataset,
    remediationPlan,
  };

  return Object.assign(report, {
    reviewerPacket: renderReviewerPacket(report),
  });
}

function summarizeCell(cell, index, limits) {
  const source = normalizeText(cell.source);
  const outputs = Array.isArray(cell.outputs) ? cell.outputs : [];
  const outputText = outputs.map(function mapOutput(output) {
    return normalizeText(output.text || output.data || output);
  }).join("\n");
  const outputBytes = byteLength(outputText);
  const mimeTypes = collectMimeTypes(outputs);
  const hasVisualOutput = mimeTypes.some(function visualMime(mime) {
    return mime.startsWith("image/") || mime === "text/html" || mime === "application/vnd.plotly.v1+json";
  });
  const hasAltText = Boolean(cell.altText || (cell.metadata && (cell.metadata.altText || cell.metadata.description)) || outputs.some(function outputAlt(output) {
    return output.altText || (output.metadata && output.metadata.altText);
  }));
  const flags = [];
  const cellType = cell.cellType || cell.cell_type || "unknown";

  if (containsSecret(source) || containsSecret(outputText)) flags.push("possible-secret");
  if (/<script\b|javascript:/i.test(outputText)) flags.push("active-html");
  if (outputBytes > limits.maxInlineOutputBytes) flags.push("oversized-output");
  if (hasVisualOutput && !hasAltText) flags.push("missing-alt-text");
  if (cellType === "code" && outputs.length === 0) flags.push("no-output");

  return {
    cellIndex: index + 1,
    cellType,
    executionCount: cell.executionCount === undefined ? (cell.execution_count === undefined ? null : cell.execution_count) : cell.executionCount,
    sourceBytes: byteLength(source),
    outputBytes,
    outputCount: outputs.length,
    mimeTypes,
    hasVisualOutput,
    hasAltText,
    previewMode: outputBytes > limits.maxInlineOutputBytes ? "external-reference" : hasVisualOutput ? "rich-preview" : "inline-text",
    flags,
  };
}

function evaluateMetadata(metadata, project) {
  const present = [];
  const missing = [];
  const required = [
    ["doi", metadata.doi || metadata.identifier],
    ["authors", Array.isArray(metadata.authors) && metadata.authors.length > 0],
    ["license", metadata.license || project.license],
    ["keywords", Array.isArray(metadata.keywords) && metadata.keywords.length > 0],
    ["resourceType", metadata.resourceType || metadata.resource_type],
    ["accessRights", metadata.accessRights || metadata.access_rights || metadata.access],
    ["schemaOrgType", metadata.schemaOrgType || (metadata.schemaOrg && metadata.schemaOrg["@type"])],
  ];

  required.forEach(function checkRequired(entry) {
    if (entry[1]) present.push(entry[0]);
    else missing.push(entry[0]);
  });

  return { present, missing };
}

function evaluateArtifacts(artifacts, limits) {
  const failures = [];
  const summary = artifacts.map(function mapArtifact(artifact) {
    const issueIds = [];
    if (!artifact.checksum) issueIds.push("missing-checksum");
    if (!artifact.mimeType && !artifact.mime) issueIds.push("missing-mime-type");
    if (!artifact.license) issueIds.push("missing-license");
    if (Number(artifact.sizeBytes || 0) > limits.maxArtifactBytes) issueIds.push("artifact-over-budget");
    if (artifact.previewGenerated === false) issueIds.push("preview-not-generated");
    if (issueIds.length > 0) {
      failures.push({
        path: artifact.path || artifact.name || "unnamed-artifact",
        issues: issueIds,
      });
    }
    return {
      path: artifact.path || artifact.name || "unnamed-artifact",
      type: artifact.type || inferArtifactType(artifact.path || artifact.name || ""),
      sizeBytes: Number(artifact.sizeBytes || 0),
      checksum: artifact.checksum || null,
      previewGenerated: artifact.previewGenerated !== false,
      issues: issueIds,
    };
  });

  return { failures, summary };
}

function evaluateEnvironment(environment) {
  const missing = [];
  if (!environment.kernel) missing.push("kernel");
  if (!environment.language) missing.push("language");
  if (!environment.runtime && !environment.containerImage) missing.push("runtime-or-container");
  if (!environment.lockfile && !environment.lockfileDigest) missing.push("dependency-lock");
  if (!environment.seedPolicy && !environment.randomSeed) missing.push("seed-policy");
  if (Array.isArray(environment.dependencies)) {
    const unpinned = environment.dependencies.filter(function unpinned(dependency) {
      return !/[=~<>!]=|@|\b\d+\.\d+/.test(String(dependency.version || dependency));
    });
    if (unpinned.length > 0) missing.push("pinned-dependencies");
  }
  return { missing };
}

function findExecutionOrderWarnings(cells) {
  const codeCells = cells.filter(function filterCode(cell) {
    return cell.cellType === "code";
  });
  const counts = codeCells.map(function mapCount(cell) {
    return cell.executionCount;
  }).filter(function presentCount(count) {
    return count !== null && count !== undefined;
  });
  const warnings = [];

  if (codeCells.length > 0 && counts.length !== codeCells.length) warnings.push("some-code-cells-lack-execution-counts");
  if (new Set(counts).size !== counts.length) warnings.push("duplicate-execution-counts");
  for (let index = 1; index < counts.length; index += 1) {
    if (counts[index] < counts[index - 1]) {
      warnings.push("execution-counts-out-of-order");
      break;
    }
  }
  return warnings;
}

function calculateScore(checks) {
  const penalty = checks.reduce(function sumPenalty(sum, check) {
    if (check.status === "pass") return sum;
    return sum + SEVERITY_WEIGHT[check.severity];
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function decide(checks, score) {
  const hasCriticalFailure = checks.some(function critical(check) {
    return check.status === "fail" && check.severity === "critical";
  });
  const hasHighFailure = checks.some(function high(check) {
    return check.status === "fail" && check.severity === "high";
  });
  const hasWarning = checks.some(function warn(check) {
    return check.status === "warn";
  });
  if (hasCriticalFailure || score < 55) return "blocked";
  if (hasHighFailure || score < 85 || hasWarning) return "needs-review";
  return "ready";
}

function calculateFairScore(metadataResult, artifactResult, environmentResult) {
  const components = {
    findable: scoreFromMissing(metadataResult, ["doi", "keywords", "schemaOrgType"]),
    accessible: artifactResult.failures.some(function previewFailure(failure) {
      return failure.issues.includes("preview-not-generated");
    }) ? 65 : 95,
    interoperable: scoreFromMissing(metadataResult, ["resourceType", "schemaOrgType"]),
    reusable: Math.max(35, 100 - (artifactResult.failures.length * 8) - (environmentResult.missing.length * 5)),
  };
  components.overall = Math.round((components.findable + components.accessible + components.interoperable + components.reusable) / 4);
  return components;
}

function scoreFromMissing(metadataResult, expected) {
  const missingCount = expected.filter(function missing(key) {
    return metadataResult.missing.includes(key);
  }).length;
  return Math.max(40, 100 - missingCount * 20);
}

function buildDataCiteDraft(metadata, project) {
  const authors = Array.isArray(metadata.authors) ? metadata.authors : [];
  return {
    identifier: metadata.doi || metadata.identifier || null,
    creators: authors.map(function mapAuthor(author) {
      return {
        name: author.name || author,
        affiliation: author.affiliation || null,
        orcid: author.orcid || null,
      };
    }),
    titles: [{ title: project.title || metadata.title || "Untitled notebook package" }],
    publisher: metadata.publisher || project.owner || "SCIBASE.AI",
    publicationYear: metadata.publicationYear || new Date().getUTCFullYear(),
    resourceType: {
      resourceTypeGeneral: metadata.resourceType || "ComputationalNotebook",
    },
    rightsList: [{ rights: metadata.license || project.license || "unspecified" }],
    subjects: metadata.keywords || [],
  };
}

function buildSchemaOrgDataset(metadata, project, artifacts) {
  return {
    "@context": "https://schema.org",
    "@type": metadata.schemaOrgType || (metadata.schemaOrg && metadata.schemaOrg["@type"]) || "Dataset",
    name: project.title || metadata.title || "Untitled notebook package",
    identifier: metadata.doi || metadata.identifier || project.projectId || null,
    license: metadata.license || project.license || null,
    keywords: metadata.keywords || [],
    creator: (metadata.authors || []).map(function mapCreator(author) {
      return {
        "@type": "Person",
        name: author.name || author,
        affiliation: author.affiliation || undefined,
      };
    }),
    distribution: artifacts.map(function mapDistribution(artifact) {
      return {
        "@type": "DataDownload",
        contentUrl: artifact.path || artifact.name,
        encodingFormat: artifact.mimeType || artifact.mime || inferMimeFromPath(artifact.path || artifact.name || ""),
        contentSize: artifact.sizeBytes ? String(artifact.sizeBytes) : undefined,
        sha256: artifact.checksum || undefined,
      };
    }),
  };
}

function buildRemediationPlan(checks) {
  return checks.filter(function notPass(check) {
    return check.status !== "pass";
  }).map(function mapPlan(check) {
    return {
      checkId: check.id,
      severity: check.severity,
      action: remediationFor(check),
    };
  });
}

function remediationFor(check) {
  const actions = {
    "notebook-present": "Attach a valid ipynb payload or code notebook export before generating public previews.",
    "cell-count-budget": "Split the notebook preview into sections or collapse low-value appendix cells.",
    "notebook-size-budget": "Move large binary outputs into checksum-addressed artifacts and keep notebook JSON lightweight.",
    "unsafe-preview-content": "Redact credentials, tokens, private keys, and active HTML before publishing the preview.",
    "inline-output-budget": "Externalize heavy outputs to artifact storage and reference them from the preview manifest.",
    "execution-order-coherence": "Re-run the notebook from a clean kernel so execution counts are complete and monotonic.",
    "visual-alt-text": "Add alt text or figure descriptions for every visual output.",
    "fair-metadata": "Complete DOI, author, license, keyword, access, resource type, and schema.org metadata.",
    "artifact-preview-readiness": "Add checksums, MIME types, licenses, and generated previews for every artifact.",
    "execution-environment-capture": "Capture kernel, language, runtime or container image, lockfile digest, and seed policy.",
  };
  return actions[check.id] || "Review this finding and add the missing evidence.";
}

function renderReviewerPacket(report) {
  const failingChecks = report.checks.filter(function notPass(check) {
    return check.status !== "pass";
  });
  const lines = [
    "# Notebook Preview Integrity Packet",
    "",
    "Project: " + report.title,
    "Decision: " + report.decision,
    "Preview score: " + String(report.score) + "/100",
    "FAIR score: " + String(report.fairScore.overall) + "/100",
    "Digest: " + report.digest,
    "",
    "## Findings",
    "",
  ];

  if (failingChecks.length === 0) {
    lines.push("- No blocking or warning findings.");
  } else {
    failingChecks.forEach(function addFinding(check) {
      lines.push("- " + check.id + " (" + check.severity + "): " + check.message);
    });
  }

  lines.push("", "## Remediation", "");
  if (report.remediationPlan.length === 0) {
    lines.push("- Ready for public preview publication.");
  } else {
    report.remediationPlan.forEach(function addPlan(item) {
      lines.push("- " + item.checkId + ": " + item.action);
    });
  }

  lines.push("", "## Preview Manifest", "");
  report.previewManifest.forEach(function addCell(cell) {
    const flags = cell.flags.length ? cell.flags.join(", ") : "none";
    lines.push("- Cell " + String(cell.cellIndex) + ": " + cell.cellType + ", " + cell.previewMode + ", " + formatBytes(cell.outputBytes) + " output, flags: " + flags);
  });

  return lines.join("\n");
}

function renderDashboardSvg(report) {
  const width = 960;
  const height = 540;
  const statusColor = report.decision === "ready" ? "#147D64" : report.decision === "needs-review" ? "#A45D00" : "#B42318";
  const checkRows = report.checks.slice(0, 7).map(function mapCheckRow(check, index) {
    const y = 200 + index * 36;
    const color = check.status === "pass" ? "#147D64" : check.status === "warn" ? "#A45D00" : "#B42318";
    return "<text x=\"64\" y=\"" + String(y) + "\" font-size=\"18\" fill=\"#1F2937\">" + escapeXml(check.id) + "</text><text x=\"760\" y=\"" + String(y) + "\" font-size=\"18\" fill=\"" + color + "\" text-anchor=\"end\">" + escapeXml(check.status) + "</text>";
  }).join("\n");

  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + String(width) + "\" height=\"" + String(height) + "\" viewBox=\"0 0 " + String(width) + " " + String(height) + "\" role=\"img\" aria-label=\"Notebook preview integrity dashboard\">",
    "<rect width=\"" + String(width) + "\" height=\"" + String(height) + "\" fill=\"#F8FAFC\"/>",
    "<rect x=\"36\" y=\"32\" width=\"888\" height=\"476\" rx=\"8\" fill=\"#FFFFFF\" stroke=\"#CBD5E1\"/>",
    "<text x=\"64\" y=\"82\" font-family=\"Arial, sans-serif\" font-size=\"30\" font-weight=\"700\" fill=\"#0F172A\">Notebook Preview Integrity Gate</text>",
    "<text x=\"64\" y=\"118\" font-family=\"Arial, sans-serif\" font-size=\"18\" fill=\"#475569\">" + escapeXml(report.title) + "</text>",
    "<circle cx=\"122\" cy=\"164\" r=\"44\" fill=\"" + statusColor + "\" opacity=\"0.14\"/>",
    "<text x=\"122\" y=\"174\" font-family=\"Arial, sans-serif\" font-size=\"34\" font-weight=\"700\" fill=\"" + statusColor + "\" text-anchor=\"middle\">" + String(report.score) + "</text>",
    "<text x=\"204\" y=\"156\" font-family=\"Arial, sans-serif\" font-size=\"22\" font-weight=\"700\" fill=\"" + statusColor + "\">" + escapeXml(report.decision) + "</text>",
    "<text x=\"204\" y=\"184\" font-family=\"Arial, sans-serif\" font-size=\"16\" fill=\"#475569\">FAIR " + String(report.fairScore.overall) + "/100 - " + String(report.previewManifest.length) + " cells reviewed</text>",
    "<line x1=\"64\" y1=\"214\" x2=\"824\" y2=\"214\" stroke=\"#E2E8F0\"/>",
    checkRows,
    "<text x=\"64\" y=\"482\" font-family=\"Arial, sans-serif\" font-size=\"14\" fill=\"#64748B\">Digest " + escapeXml(report.digest.slice(0, 24)) + "</text>",
    "</svg>",
  ].join("\n");
}

function addCheck(checks, id, status, severity, message, evidence = {}) {
  checks.push({ id, status, severity, message, evidence });
}

function collectMimeTypes(outputs) {
  const types = new Set();
  outputs.forEach(function eachOutput(output) {
    if (output.mimeType) types.add(output.mimeType);
    if (output.data && typeof output.data === "object" && !Array.isArray(output.data)) {
      Object.keys(output.data).forEach(function addKey(key) {
        types.add(key);
      });
    }
    if (output.output_type === "display_data" && output.data) {
      Object.keys(output.data).forEach(function addDisplayKey(key) {
        types.add(key);
      });
    }
    if (typeof output === "string") types.add("text/plain");
  });
  return Array.from(types).sort();
}

function normalizeText(value) {
  if (Array.isArray(value)) return value.join("");
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function byteLength(value) {
  return Buffer.byteLength(normalizeText(value), "utf8");
}

function containsSecret(value) {
  const text = normalizeText(value);
  return SECRET_PATTERNS.some(function secret(pattern) {
    return pattern.test(text);
  });
}

function inferArtifactType(path) {
  const lower = path.toLowerCase();
  if (/\.(csv|tsv|json|parquet|xlsx)$/.test(lower)) return "dataset";
  if (/\.(ipynb|py|r|jl|js)$/.test(lower)) return "code";
  if (/\.(png|jpg|jpeg|svg|webp)$/.test(lower)) return "figure";
  return "artifact";
}

function inferMimeFromPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".ipynb")) return "application/x-ipynb+json";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(sortKeys(value))).digest("hex");
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce(function reduceKeys(result, key) {
    result[key] = sortKeys(value[key]);
    return result;
  }, {});
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return String(value) + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  auditNotebookPreviewIntegrity,
  renderReviewerPacket,
  renderDashboardSvg,
  formatBytes,
};
