const crypto = require("node:crypto");

const PUBLISHABLE = "publishable";
const NOTICE_REQUIRED = "notice_required";
const CONFLICT = "conflict";
const HOLD = "hold";

const PERMISSIVE_LICENSES = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause"]);
const OPEN_DATA_LICENSES = new Set(["CC-BY-4.0", "CC0-1.0", "ODC-BY-1.0"]);
const COPYLEFT_LICENSES = new Set(["GPL-3.0", "AGPL-3.0", "LGPL-3.0"]);
const NON_COMMERCIAL_LICENSES = new Set(["CC-BY-NC-4.0", "CC-BY-NC-SA-4.0"]);

function requireFields(value, fields, label) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null || value[field] === "") {
      throw new Error(`missing required ${label} field: ${field}`);
    }
  }
}

function normalizeLicense(value) {
  return String(value || "").trim();
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createAuditDigest(result) {
  const payload = {
    asOf: result.asOf,
    repositoryId: result.repositoryId,
    versionTag: result.versionTag,
    totals: result.totals,
    decisions: result.decisions.map((decision) => ({
      id: decision.id,
      license: decision.license,
      status: decision.status,
      reasons: decision.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function requiresNotice(license) {
  return (
    PERMISSIVE_LICENSES.has(license) ||
    OPEN_DATA_LICENSES.has(license) ||
    COPYLEFT_LICENSES.has(license) ||
    NON_COMMERCIAL_LICENSES.has(license)
  );
}

function isCommercialExport(intent) {
  return /commercial|partner|enterprise/i.test(intent);
}

function evaluateAsset(asset, release) {
  requireFields(asset, ["id", "componentType", "path", "exportIncluded"], "asset");

  const license = normalizeLicense(asset.license);
  const reasons = [];
  const actions = [];
  const base = {
    id: asset.id,
    componentType: asset.componentType,
    path: asset.path,
    license,
    exportIncluded: Boolean(asset.exportIncluded),
    status: PUBLISHABLE,
    releaseBlocking: false,
    reasons,
    actions,
  };

  if (!asset.exportIncluded) {
    return {
      ...base,
      status: PUBLISHABLE,
      reasons: ["asset is not included in the release export"],
      actions: ["No release action required"],
    };
  }

  if (!license) {
    return {
      ...base,
      status: HOLD,
      releaseBlocking: true,
      reasons: ["asset has no normalized SPDX or data license"],
      actions: [
        "Hold tagged release and export bundle",
        "Attach license metadata or remove asset from export",
      ],
    };
  }

  if (/proprietary|restricted|unknown/i.test(license)) {
    return {
      ...base,
      status: HOLD,
      releaseBlocking: true,
      reasons: ["asset license is proprietary, restricted, or unknown"],
      actions: [
        "Exclude from public DOI/export package",
        "Request rights review and replacement artifact",
      ],
    };
  }

  if (NON_COMMERCIAL_LICENSES.has(license) && isCommercialExport(release.exportIntent)) {
    return {
      ...base,
      status: CONFLICT,
      releaseBlocking: true,
      reasons: ["non-commercial license conflicts with commercial partner export intent"],
      actions: [
        "Block commercial export until asset is relicensed or omitted",
        "Generate public-only export variant if permitted",
      ],
    };
  }

  if (COPYLEFT_LICENSES.has(license)) {
    const sourceOkay = release.sourceBundleIncluded && asset.sourceAvailable;
    const forkOkay = !asset.derivedFromFork || asset.forkLicense === license;
    if (!sourceOkay || !forkOkay) {
      return {
        ...base,
        status: HOLD,
        releaseBlocking: true,
        reasons: [
          !sourceOkay
            ? "copyleft asset requires source bundle availability"
            : "fork attribution license does not match derived asset",
        ],
        actions: [
          "Hold release until source and fork license evidence are complete",
          "Attach copy of license and source bundle manifest",
        ],
      };
    }
  }

  if (requiresNotice(license) && (!asset.noticeIncluded || !asset.attribution)) {
    return {
      ...base,
      status: NOTICE_REQUIRED,
      releaseBlocking: false,
      reasons: ["license permits export but attribution or notice is incomplete"],
      actions: [
        "Add license notice to export manifest",
        "Include attribution in citation and repository notice files",
      ],
    };
  }

  if (
    !PERMISSIVE_LICENSES.has(license) &&
    !OPEN_DATA_LICENSES.has(license) &&
    !COPYLEFT_LICENSES.has(license) &&
    !NON_COMMERCIAL_LICENSES.has(license)
  ) {
    return {
      ...base,
      status: HOLD,
      releaseBlocking: true,
      reasons: ["license is not in the supported compatibility matrix"],
      actions: [
        "Route to legal/repository steward review before release",
        "Map license to compatibility policy",
      ],
    };
  }

  return {
    ...base,
    status: PUBLISHABLE,
    releaseBlocking: false,
    reasons: ["license is compatible with the requested release/export intent"],
    actions: [
      "Allow asset in DOI/export package",
      "Preserve license metadata in manifest",
    ],
  };
}

function analyzeRepositoryLicenses(packet, options = {}) {
  requireFields(packet, ["release", "assets"], "repository license packet");
  requireFields(packet.release, ["repositoryId", "versionTag", "exportIntent"], "release");

  if (!Array.isArray(packet.assets)) {
    throw new Error("assets must be an array");
  }

  const asOf = options.asOf || packet.asOf || new Date().toISOString();
  const decisions = packet.assets.map((asset) => evaluateAsset(asset, packet.release));
  const totals = decisions.reduce(
    (acc, decision) => {
      acc.totalAssets += 1;
      acc.releaseBlockingAssets += decision.releaseBlocking ? 1 : 0;
      acc.byStatus[decision.status] = (acc.byStatus[decision.status] || 0) + 1;
      return acc;
    },
    {
      totalAssets: 0,
      releaseBlockingAssets: 0,
      byStatus: {},
    }
  );
  const result = {
    asOf,
    repositoryId: packet.release.repositoryId,
    versionTag: packet.release.versionTag,
    exportIntent: packet.release.exportIntent,
    totals,
    decisions,
  };

  return {
    ...result,
    auditDigest: createAuditDigest(result),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Repository License Compatibility Guard",
    "",
    `Repository: ${result.repositoryId}`,
    `Version: ${result.versionTag}`,
    `Export intent: ${result.exportIntent}`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Totals",
    "",
    `- Assets evaluated: ${result.totals.totalAssets}`,
    `- Release-blocking assets: ${result.totals.releaseBlockingAssets}`,
  ];

  for (const [status, count] of Object.entries(result.totals.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Asset Decisions", "");
  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.id}`,
      "",
      `- Path: ${decision.path}`,
      `- Type: ${decision.componentType}`,
      `- License: ${decision.license || "(missing)"}`,
      `- Status: ${decision.status}`,
      `- Release blocking: ${decision.releaseBlocking}`,
      `- Reasons: ${decision.reasons.join("; ")}`,
      `- Actions: ${decision.actions.join("; ")}`,
      ""
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const rows = Object.entries(result.totals.byStatus)
    .sort()
    .map(([status, count], index) => {
      const y = 154 + index * 46;
      const width = Math.max(44, count * 94);
      return `<text x="58" y="${y + 23}" class="label">${escapeXml(status)}</text>
  <rect x="290" y="${y}" width="${width}" height="28" rx="5" class="bar"/>
  <text x="${302 + width}" y="${y + 22}" class="value">${count}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <style>
    .bg{fill:#111827}
    .panel{fill:#f8fafc}
    .title{font:700 34px Arial,sans-serif;fill:#0f172a}
    .meta{font:400 18px Arial,sans-serif;fill:#475569}
    .label{font:600 20px Arial,sans-serif;fill:#1e293b}
    .value{font:700 20px Arial,sans-serif;fill:#0f172a}
    .bar{fill:#f59e0b}
    .digest{font:400 15px monospace;fill:#334155}
  </style>
  <rect class="bg" width="960" height="540"/>
  <rect class="panel" x="28" y="28" width="904" height="484" rx="16"/>
  <text x="58" y="82" class="title">Repository License Compatibility Guard</text>
  <text x="58" y="116" class="meta">Assets ${result.totals.totalAssets} | Blocking ${result.totals.releaseBlockingAssets}</text>
  ${rows}
  <text x="58" y="482" class="digest">audit ${escapeXml(result.auditDigest.slice(0, 48))}</text>
</svg>
`;
}

module.exports = {
  PUBLISHABLE,
  NOTICE_REQUIRED,
  CONFLICT,
  HOLD,
  analyzeRepositoryLicenses,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
