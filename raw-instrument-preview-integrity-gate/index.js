"use strict";

const SUPPORTED_RAW_TYPES = Object.freeze({
  fcs: {
    label: "Flow cytometry standard",
    requiredMetadata: ["instrumentModel", "detectorPanel", "compensationMatrix", "units"],
    previewKind: "gated_scatter_summary"
  },
  mzml: {
    label: "Mass spectrometry mzML",
    requiredMetadata: ["instrumentModel", "ionMode", "mzRange", "units"],
    previewKind: "peak_intensity_summary"
  },
  nd2: {
    label: "Microscopy ND2 image stack",
    requiredMetadata: ["instrumentModel", "objective", "channelMap", "pixelSizeMicrons", "units"],
    previewKind: "channel_thumbnail_contact_sheet"
  },
  h5: {
    label: "Instrument HDF5 bundle",
    requiredMetadata: ["instrumentModel", "schemaVersion", "axisMap", "units"],
    previewKind: "dataset_tree_summary"
  }
});

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function extensionFor(fileName) {
  return String(fileName || "").split(".").pop().toLowerCase();
}

function checksumChanged(artifact) {
  return Boolean(artifact.expectedChecksum && artifact.actualChecksum && artifact.expectedChecksum !== artifact.actualChecksum);
}

function metadataDiff(artifact) {
  const expected = artifact.expectedMetadata || {};
  const observed = artifact.observedMetadata || {};
  const keys = new Set([...Object.keys(expected), ...Object.keys(observed)]);
  const diffs = [];
  for (const key of keys) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(observed[key])) {
      diffs.push({ field: key, expected: expected[key] ?? null, observed: observed[key] ?? null });
    }
  }
  return diffs;
}

function missingRequiredMetadata(artifact, typeSpec) {
  const observed = artifact.observedMetadata || {};
  return typeSpec.requiredMetadata.filter((field) => observed[field] === undefined || observed[field] === null || observed[field] === "");
}

function unitDrift(artifact) {
  const expectedUnits = artifact.expectedMetadata?.units || {};
  const observedUnits = artifact.observedMetadata?.units || {};
  const fields = new Set([...Object.keys(expectedUnits), ...Object.keys(observedUnits)]);
  return [...fields].filter((field) => expectedUnits[field] !== observedUnits[field]);
}

function calibrationDrift(artifact) {
  const expected = artifact.expectedMetadata?.calibration || {};
  const observed = artifact.observedMetadata?.calibration || {};
  const fields = new Set([...Object.keys(expected), ...Object.keys(observed)]);
  return [...fields].filter((field) => {
    const left = Number(expected[field]);
    const right = Number(observed[field]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return expected[field] !== observed[field];
    const denominator = Math.max(Math.abs(left), 1);
    return Math.abs(left - right) / denominator > Number(artifact.calibrationTolerance || 0.02);
  });
}

function licenseRisk(artifact) {
  if (artifact.license === "restricted" && artifact.previewPolicy !== "metadata-only") {
    return "restricted_license_requires_metadata_only_preview";
  }
  return null;
}

function validatePreviewTransform(transform) {
  const failures = [];
  if (!transform) {
    failures.push("preview transform is missing");
    return failures;
  }
  if (transform.requiresRawValueExport) failures.push("preview transform would expose raw values");
  if (!transform.deterministic) failures.push("preview transform is not deterministic");
  if (!transform.recordsLineage) failures.push("preview transform does not record lineage");
  if (transform.downsampleRatio !== undefined && Number(transform.downsampleRatio) > 0.25) {
    failures.push("preview transform downsample ratio is too high for safe preview");
  }
  return failures;
}

function previewDecision(artifact) {
  const type = extensionFor(artifact.fileName);
  const typeSpec = SUPPORTED_RAW_TYPES[type];
  const reasons = [];
  if (!typeSpec) {
    return {
      artifactId: artifact.id,
      fileName: artifact.fileName,
      rawType: type,
      previewKind: "unsupported",
      decision: "block_preview",
      severity: "high",
      score: 76,
      reasons: [`unsupported raw instrument type: ${type}`],
      datacite: null,
      schemaOrg: null
    };
  }

  if (checksumChanged(artifact)) reasons.push("raw artifact checksum changed");
  const diffs = metadataDiff(artifact);
  const missing = missingRequiredMetadata(artifact, typeSpec);
  const unitFields = unitDrift(artifact);
  const calibrationFields = calibrationDrift(artifact);
  const transformFailures = validatePreviewTransform(artifact.previewTransform);
  const licenseFailure = licenseRisk(artifact);

  if (missing.length) reasons.push(`missing required metadata: ${missing.join(", ")}`);
  if (unitFields.length) reasons.push(`unit metadata drift: ${unitFields.join(", ")}`);
  if (calibrationFields.length) reasons.push(`calibration drift: ${calibrationFields.join(", ")}`);
  if (diffs.some((diff) => diff.field === "instrumentModel")) reasons.push("instrument model drift");
  if (transformFailures.length) reasons.push(...transformFailures);
  if (licenseFailure) reasons.push(licenseFailure);
  if (artifact.embargoed && artifact.previewPolicy !== "metadata-only") reasons.push("embargoed artifact requires metadata-only preview");

  const score = Math.min(
    100,
    18 +
      (checksumChanged(artifact) ? 32 : 0) +
      missing.length * 10 +
      unitFields.length * 12 +
      calibrationFields.length * 12 +
      transformFailures.length * 11 +
      (licenseFailure ? 20 : 0) +
      (artifact.embargoed && artifact.previewPolicy !== "metadata-only" ? 20 : 0)
  );

  const decision = score >= 70 || checksumChanged(artifact) ? "block_preview" : score >= 40 ? "metadata_only_preview" : "allow_safe_preview";
  const severity = decision === "block_preview" ? "high" : decision === "metadata_only_preview" ? "medium" : "low";

  return {
    artifactId: artifact.id,
    fileName: artifact.fileName,
    rawType: type,
    previewKind: decision === "allow_safe_preview" ? typeSpec.previewKind : "metadata_packet",
    decision,
    severity,
    score: round(score),
    reasons: [...new Set(reasons)],
    datacite: buildDataCitePacket(artifact, typeSpec, decision),
    schemaOrg: buildSchemaOrgPacket(artifact, typeSpec, decision)
  };
}

function buildDataCitePacket(artifact, typeSpec, decision) {
  return {
    identifier: artifact.doi || artifact.id,
    creators: artifact.creators || [],
    titles: [{ title: artifact.title }],
    publisher: artifact.publisher || "SCIBASE synthetic repository",
    publicationYear: artifact.publicationYear || new Date().getUTCFullYear(),
    types: { resourceTypeGeneral: "Dataset", resourceType: typeSpec.label },
    rightsList: [{ rights: artifact.license || "unknown" }],
    descriptions: [
      {
        descriptionType: "TechnicalInfo",
        description: `Preview decision: ${decision}; transform: ${artifact.previewTransform?.name || "none"}`
      }
    ]
  };
}

function buildSchemaOrgPacket(artifact, typeSpec, decision) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    identifier: artifact.doi || artifact.id,
    name: artifact.title,
    measurementTechnique: typeSpec.label,
    license: artifact.license,
    encodingFormat: extensionFor(artifact.fileName),
    variableMeasured: Object.keys(artifact.observedMetadata?.units || {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: "previewDecision", value: decision },
      { "@type": "PropertyValue", name: "previewKind", value: typeSpec.previewKind },
      { "@type": "PropertyValue", name: "actualChecksum", value: artifact.actualChecksum }
    ]
  };
}

function buildPreviewIntegrityGate(input) {
  const data = input || {};
  assertArray(data.artifacts, "artifacts");
  const decisions = data.artifacts.map(previewDecision).sort((a, b) => b.score - a.score || a.fileName.localeCompare(b.fileName));
  return {
    generatedAt: new Date().toISOString(),
    decisions,
    stats: {
      artifactCount: decisions.length,
      blocked: decisions.filter((decision) => decision.decision === "block_preview").length,
      metadataOnly: decisions.filter((decision) => decision.decision === "metadata_only_preview").length,
      safePreview: decisions.filter((decision) => decision.decision === "allow_safe_preview").length
    },
    reviewerQueue: decisions
      .filter((decision) => decision.decision !== "allow_safe_preview")
      .map((decision) => ({
        artifactId: decision.artifactId,
        fileName: decision.fileName,
        decision: decision.decision,
        reasons: decision.reasons
      }))
  };
}

function renderPreviewSvg(report) {
  const width = 940;
  const rowHeight = 84;
  const height = 124 + report.decisions.length * rowHeight;
  const rows = report.decisions
    .map((decision, index) => {
      const y = 90 + index * rowHeight;
      const color =
        decision.decision === "block_preview"
          ? "#be123c"
          : decision.decision === "metadata_only_preview"
            ? "#b45309"
            : "#15803d";
      return [
        `<g transform="translate(38 ${y})">`,
        `<rect x="0" y="0" width="864" height="66" rx="8" fill="#ffffff" stroke="#dfe5ee"/>`,
        `<text x="18" y="25" font-family="Arial" font-size="16" font-weight="700" fill="#1d2733">${escapeXml(decision.fileName)}</text>`,
        `<text x="18" y="49" font-family="Arial" font-size="12" fill="#657080">${escapeXml(decision.rawType)} | ${escapeXml(decision.decision)} | score ${decision.score}</text>`,
        `<rect x="556" y="24" width="300" height="16" rx="8" fill="#eef2f7"/>`,
        `<rect x="556" y="24" width="${Math.max(16, Math.round(decision.score * 3))}" height="16" rx="8" fill="${color}"/>`,
        `</g>`
      ].join("");
    })
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f5f7fb"/>`,
    `<text x="38" y="42" font-family="Arial" font-size="25" font-weight="700" fill="#1d2733">Raw Instrument Preview Integrity Gate</text>`,
    `<text x="38" y="66" font-family="Arial" font-size="14" fill="#657080">Preserves calibration, units, checksums, and safe preview policy for instrument outputs.</text>`,
    rows,
    `</svg>`
  ].join("");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  SUPPORTED_RAW_TYPES,
  buildPreviewIntegrityGate,
  checksumChanged,
  metadataDiff,
  previewDecision,
  renderPreviewSvg,
  unitDrift,
  calibrationDrift
};
