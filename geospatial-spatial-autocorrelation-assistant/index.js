"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

const DEFAULT_POLICY = {
  minSpatialHoldoutKm: 25,
  highMoransI: 0.35,
  maxSensitivePrecisionDecimals: 4,
  minRegionsForBroadClaims: 3,
  maxCovariateWindowDays: 365
};

function evaluateGeospatialReviewPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateGeospatialReviewPacket expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const policy = { ...DEFAULT_POLICY, ...(isPlainObject(packet.policy) ? packet.policy : {}) };
  const manuscripts = asArray(packet.manuscripts);
  const findings = [];

  if (manuscripts.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_MANUSCRIPTS",
        "high",
        "The geospatial review packet has no manuscripts to inspect.",
        "AI peer review output needs at least one manuscript or study packet.",
        "manuscripts",
        "Attach manuscript metadata, spatial design, samples, model split evidence, and reproducibility artifacts.",
        "research assistant owner"
      )
    );
  }

  manuscripts.forEach((manuscript, index) => inspectManuscript(manuscript, index, policy, findings));

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const reviewDecisions = manuscripts.map((manuscript, index) =>
    buildReviewDecision(manuscript, index, sortedFindings)
  );
  const researchGapOpportunities = buildResearchGapOpportunities(manuscripts, sortedFindings, policy);
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    manuscriptId: item.manuscriptId ?? null,
    modelId: item.modelId ?? null,
    owner: item.owner,
    action: item.remediation
  }));

  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        policy,
        manuscripts: manuscripts.map((manuscript) => ({
          id: manuscript.id,
          spatialDesign: manuscript.spatialDesign,
          claims: manuscript.claims,
          models: manuscript.models,
          artifactKeys: Object.keys(isPlainObject(manuscript.reproducibilityArtifacts) ? manuscript.reproducibilityArtifacts : {})
        })),
        codes: sortedFindings.map((item) => item.code)
      })
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: now,
    status,
    summary: summarize(status, sortedFindings, manuscripts.length, researchGapOpportunities.length),
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    reviewDecisions,
    researchGapOpportunities,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    "# Geospatial Spatial-Autocorrelation Review Assistant",
    "",
    `Packet: ${packet.id ?? "unknown"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Manuscript Decisions",
    ""
  ];

  result.reviewDecisions.forEach((decision) => {
    lines.push(
      `- ${decision.manuscriptId}: ${decision.decision}; reproducibility score ${decision.reproducibilityScore}/100; ${decision.reasonCodes.length} finding(s)`
    );
  });

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No geospatial peer-review blockers found.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  - Evidence: ${item.evidence}`);
      lines.push(`  - Remediation: ${item.remediation}`);
    });
  }

  lines.push("", "## Research Gap Opportunities", "");
  if (result.researchGapOpportunities.length === 0) {
    lines.push("- No under-sampled geography or replication opportunities were generated.");
  } else {
    result.researchGapOpportunities.forEach((gap) => {
      lines.push(`- ${gap.id}: ${gap.title}`);
      lines.push(`  - Rationale: ${gap.rationale}`);
      lines.push(`  - First action: ${gap.firstAction}`);
    });
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.findingCounts;
  const critical = counts.critical ?? 0;
  const high = counts.high ?? 0;
  const warning = counts.warning ?? 0;
  const ready = result.status === "READY";
  const statusColor = ready ? "#16794c" : result.status === "REVIEW" ? "#a15c00" : "#a11b32";
  const holdWidth = Math.min(330, (critical + high) * 54);
  const warningWidth = Math.min(220, warning * 42);
  const readyWidth = ready ? 300 : Math.max(80, 300 - holdWidth);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Geospatial spatial autocorrelation review summary">`,
    `<rect width="960" height="540" fill="#101820"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="14" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Geospatial review assistant</text>`,
    `<text x="82" y="164" font-family="Arial, sans-serif" font-size="20" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="220" width="${readyWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + readyWidth}" y="220" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + readyWidth + warningWidth}" y="220" width="${holdWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">SPATIAL QA</text>`,
    `<text x="82" y="346" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${critical + high}</text>`,
    `<text x="82" y="386" font-family="Arial, sans-serif" font-size="22" fill="#334155">Research gaps: ${result.researchGapOpportunities.length}</text>`,
    `<text x="82" y="426" font-family="Arial, sans-serif" font-size="22" fill="#334155">Manuscripts checked: ${result.reviewDecisions.length}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectManuscript(manuscript, index, policy, findings) {
  const manuscriptId = manuscript.id ?? `manuscript-${index}`;
  const path = `manuscripts[${index}]`;
  const spatialDesign = isPlainObject(manuscript.spatialDesign) ? manuscript.spatialDesign : {};
  const samples = asArray(manuscript.samples);
  const models = asArray(manuscript.models);
  const claims = asArray(manuscript.claims);
  const artifacts = isPlainObject(manuscript.reproducibilityArtifacts) ? manuscript.reproducibilityArtifacts : {};

  if (!manuscript.id) {
    findings.push(
      finding(
        "MANUSCRIPT_MISSING_ID",
        "high",
        `Manuscript at index ${index} has no stable id.`,
        "Reviewer packets need stable manuscript ids for traceability.",
        `${path}.id`,
        "Assign a stable manuscript id before releasing assistant output.",
        "research assistant owner",
        manuscriptId
      )
    );
  }

  if (!spatialDesign.crs && !spatialDesign.epsg) {
    findings.push(
      finding(
        "MISSING_CRS_EVIDENCE",
        "high",
        `${manuscriptId} does not declare a coordinate reference system.`,
        "Spatial distances, joins, and raster overlays cannot be reviewed without CRS evidence.",
        `${path}.spatialDesign.crs`,
        "Declare the source CRS/EPSG code and any analysis projection used for distance or area operations.",
        "geospatial methods reviewer",
        manuscriptId
      )
    );
  }

  if (samples.length === 0) {
    findings.push(
      finding(
        "MISSING_SPATIAL_SAMPLE_TABLE",
        "high",
        `${manuscriptId} has no sample table with coordinates and split labels.`,
        "Spatial leakage and regional coverage checks need sample-level geography.",
        `${path}.samples`,
        "Attach synthetic-safe sample coordinates, split labels, site ids, and region labels.",
        "data steward",
        manuscriptId
      )
    );
  }

  inspectCoordinates(samples, path, manuscriptId, findings);
  inspectSensitivePrecision(manuscript, spatialDesign, path, manuscriptId, policy, findings);
  inspectBroadClaims(manuscript, claims, samples, path, manuscriptId, policy, findings);

  models.forEach((model, modelIndex) =>
    inspectModel(model, modelIndex, manuscript, samples, path, manuscriptId, policy, findings)
  );

  inspectArtifacts(artifacts, models, path, manuscriptId, findings);
}

function inspectCoordinates(samples, path, manuscriptId, findings) {
  samples.forEach((sample, sampleIndex) => {
    const lat = Number(sample.lat);
    const lon = Number(sample.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      findings.push(
        finding(
          "INVALID_COORDINATE",
          "critical",
          `${manuscriptId} has an invalid coordinate at sample ${sample.id ?? sampleIndex}.`,
          `Observed lat=${sample.lat}, lon=${sample.lon}.`,
          `${path}.samples[${sampleIndex}]`,
          "Correct or exclude invalid coordinates before AI peer review summarizes spatial findings.",
          "data steward",
          manuscriptId
        )
      );
    }
  });
}

function inspectSensitivePrecision(manuscript, spatialDesign, path, manuscriptId, policy, findings) {
  const sensitivity = String(manuscript.sensitivity ?? "").toLowerCase();
  const sensitive = sensitivity.includes("human") || sensitivity.includes("protected") || sensitivity.includes("restricted");
  const decimals = Number(spatialDesign.coordinatePrecisionDecimals);
  if (sensitive && Number.isFinite(decimals) && decimals > policy.maxSensitivePrecisionDecimals) {
    findings.push(
      finding(
        "SENSITIVE_COORDINATE_OVERPRECISION",
        "high",
        `${manuscriptId} exposes sensitive locations at ${decimals} decimal places.`,
        "Human-subject or protected-species locations should be generalized before reviewer packets or public summaries.",
        `${path}.spatialDesign.coordinatePrecisionDecimals`,
        `Round or jitter coordinates to ${policy.maxSensitivePrecisionDecimals} decimals or provide an approved restricted-location access path.`,
        "privacy reviewer",
        manuscriptId
      )
    );
  }
}

function inspectBroadClaims(manuscript, claims, samples, path, manuscriptId, policy, findings) {
  const broadClaims = claims.filter(isBroadClaim);
  if (broadClaims.length === 0) {
    return;
  }

  const regions = new Set(samples.map((sample) => sample.region).filter(Boolean));
  broadClaims.forEach((claim, claimIndex) => {
    const claimedRegions = asArray(claim.claimedRegions).filter(Boolean);
    const expectedRegions = Math.max(policy.minRegionsForBroadClaims, claimedRegions.length || 0);
    if (regions.size < expectedRegions) {
      findings.push(
        finding(
          "OVERBROAD_GEOGRAPHIC_CLAIM",
          "high",
          `${manuscriptId} makes a broad geographic claim with only ${regions.size} observed region(s).`,
          claim.text ?? "Broad geographic claim without matching sampled-region coverage.",
          `${path}.claims[${claimIndex}]`,
          "Limit the claim to sampled regions or add external validation sites covering the claimed geography.",
          "methods reviewer",
          manuscriptId
        )
      );
    }
  });
}

function inspectModel(model, modelIndex, manuscript, samples, path, manuscriptId, policy, findings) {
  const modelId = model.id ?? `model-${modelIndex}`;
  const modelPath = `${path}.models[${modelIndex}]`;
  const splitStrategy = String(model.splitStrategy ?? "").toLowerCase();
  const moransI = Number(model.moransI);
  const spatialSplit = isSpatialSplit(model);
  const minDistance = minimumTrainTestDistanceKm(samples);

  if (Number.isFinite(minDistance) && minDistance < policy.minSpatialHoldoutKm && !spatialSplit) {
    findings.push(
      finding(
        "SPATIAL_SPLIT_LEAKAGE",
        "critical",
        `${manuscriptId}/${modelId} has train/test samples only ${minDistance.toFixed(1)} km apart without spatial blocking.`,
        `Policy requires at least ${policy.minSpatialHoldoutKm} km or explicit spatial block validation.`,
        `${modelPath}.splitStrategy`,
        "Use spatial block, leave-site-out, or regional holdout validation and regenerate performance claims.",
        "model reviewer",
        manuscriptId,
        modelId
      )
    );
  }

  if (Number.isFinite(moransI) && moransI >= policy.highMoransI && !spatialSplit) {
    findings.push(
      finding(
        "HIGH_SPATIAL_AUTOCORRELATION_RANDOM_SPLIT",
        "high",
        `${manuscriptId}/${modelId} reports Moran's I ${moransI.toFixed(2)} with a ${model.splitStrategy ?? "missing"} split.`,
        "High spatial autocorrelation inflates random train/test validation.",
        `${modelPath}.moransI`,
        "Run spatial block cross-validation or leave-region-out validation before presenting performance as reviewer-ready.",
        "spatial statistics reviewer",
        manuscriptId,
        modelId
      )
    );
  }

  const preprocessingFitScope = String(model.preprocessingFitScope ?? "").toLowerCase();
  if (preprocessingFitScope.includes("full") && hasSpatialCovariates(model)) {
    findings.push(
      finding(
        "FULL_DATASET_PREPROCESSING_LEAKAGE",
        "high",
        `${manuscriptId}/${modelId} fits spatial preprocessing on the full dataset.`,
        "Raster normalization, imputation, or feature selection must be learned inside each training fold.",
        `${modelPath}.preprocessingFitScope`,
        "Refit preprocessing inside training folds and attach fold-specific transformation hashes.",
        "reproducibility reviewer",
        manuscriptId,
        modelId
      )
    );
  }

  const tunedOn = String(model.hyperparameterTunedOn ?? "").toLowerCase();
  if (tunedOn.includes("test") || tunedOn.includes("holdout")) {
    findings.push(
      finding(
        "TEST_SET_TUNING",
        "critical",
        `${manuscriptId}/${modelId} tunes model choices on the test/holdout set.`,
        "Reviewer-facing performance claims require a locked final test set.",
        `${modelPath}.hyperparameterTunedOn`,
        "Move tuning to inner validation folds and rerun the locked test set once.",
        "model reviewer",
        manuscriptId,
        modelId
      )
    );
  }

  inspectCovariates(model, modelPath, manuscriptId, modelId, policy, findings);

  const needsExternalValidation = asArray(manuscript.claims).some(isBroadClaim) || String(model.deploymentContext ?? "").length > 0;
  if (needsExternalValidation && asArray(model.externalValidationSites).length === 0) {
    findings.push(
      finding(
        "MISSING_EXTERNAL_SPATIAL_VALIDATION",
        "high",
        `${manuscriptId}/${modelId} lacks external spatial validation for broader deployment claims.`,
        "Broad geographic or deployment claims should be checked outside the training geography.",
        `${modelPath}.externalValidationSites`,
        "Add an out-of-region validation site or limit the manuscript claim to the sampled geography.",
        "methods reviewer",
        manuscriptId,
        modelId
      )
    );
  }

  if (!splitStrategy) {
    findings.push(
      finding(
        "MISSING_SPLIT_STRATEGY",
        "warning",
        `${manuscriptId}/${modelId} does not describe its spatial validation split strategy.`,
        "Peer review needs the split design to reason about leakage and autocorrelation.",
        `${modelPath}.splitStrategy`,
        "Document random, blocked, leave-site-out, or external validation split evidence.",
        "methods reviewer",
        manuscriptId,
        modelId
      )
    );
  }
}

function inspectCovariates(model, modelPath, manuscriptId, modelId, policy, findings) {
  asArray(model.covariates).forEach((covariate, covariateIndex) => {
    if (!covariate.source) {
      findings.push(
        finding(
          "COVARIATE_SOURCE_MISSING",
          "warning",
          `${manuscriptId}/${modelId} covariate ${covariate.name ?? covariateIndex} has no source citation or artifact id.`,
          "Raster/vector covariates should be traceable for reproducibility and recency review.",
          `${modelPath}.covariates[${covariateIndex}].source`,
          "Attach a source DOI, artifact id, or repository path for each spatial covariate.",
          "data steward",
          manuscriptId,
          modelId
        )
      );
    }

    const windowDays = Number(covariate.acquisitionWindowDays);
    if (Number.isFinite(windowDays) && windowDays > policy.maxCovariateWindowDays) {
      findings.push(
        finding(
          "STALE_COVARIATE_WINDOW",
          "warning",
          `${manuscriptId}/${modelId} covariate ${covariate.name ?? covariateIndex} spans ${windowDays} acquisition days.`,
          "Long covariate windows can hide temporal drift in geospatial models.",
          `${modelPath}.covariates[${covariateIndex}].acquisitionWindowDays`,
          "Use period-matched covariates or report temporal-drift sensitivity checks.",
          "methods reviewer",
          manuscriptId,
          modelId
        )
      );
    }

    const resolutionMeters = Number(covariate.resolutionMeters);
    if (!Number.isFinite(resolutionMeters) || resolutionMeters <= 0) {
      findings.push(
        finding(
          "COVARIATE_RESOLUTION_MISSING",
          "warning",
          `${manuscriptId}/${modelId} covariate ${covariate.name ?? covariateIndex} lacks raster/vector resolution evidence.`,
          "Spatial scale mismatch cannot be reviewed without resolution metadata.",
          `${modelPath}.covariates[${covariateIndex}].resolutionMeters`,
          "Attach spatial resolution, aggregation rules, and resampling method for each covariate.",
          "geospatial methods reviewer",
          manuscriptId,
          modelId
        )
      );
    }
  });
}

function inspectArtifacts(artifacts, models, path, manuscriptId, findings) {
  const required = [
    ["dataManifest", "DATA_MANIFEST_MISSING", "Attach a data manifest with sample ids, coordinates, split labels, and hashes."],
    ["codeCommit", "CODE_COMMIT_MISSING", "Attach the analysis code commit or immutable archive hash."],
    ["environmentSpec", "ENVIRONMENT_SPEC_MISSING", "Attach a pinned environment or container digest for spatial libraries."]
  ];

  required.forEach(([key, code, remediation]) => {
    if (!artifacts[key]) {
      findings.push(
        finding(
          code,
          "high",
          `${manuscriptId} is missing reproducibility artifact ${key}.`,
          "Geospatial results depend on data, code, and environment parity.",
          `${path}.reproducibilityArtifacts.${key}`,
          remediation,
          "reproducibility reviewer",
          manuscriptId
        )
      );
    }
  });

  const hasSpatialModel = models.some((model) => isSpatialSplit(model) || Number.isFinite(Number(model.moransI)));
  if (hasSpatialModel && !artifacts.spatialBlockMap) {
    findings.push(
      finding(
        "SPATIAL_BLOCK_MAP_MISSING",
        "warning",
        `${manuscriptId} has spatial validation claims without a block map artifact.`,
        "Reviewers need the held-out geometry or block map to audit leakage.",
        `${path}.reproducibilityArtifacts.spatialBlockMap`,
        "Attach a block-map artifact id, geometry hash, or leave-site-out manifest.",
        "geospatial methods reviewer",
        manuscriptId
      )
    );
  }
}

function buildReviewDecision(manuscript, index, findings) {
  const manuscriptId = manuscript.id ?? `manuscript-${index}`;
  const manuscriptFindings = findings.filter((item) => item.manuscriptId === manuscriptId || !item.manuscriptId);
  const decision = manuscriptFindings.some((item) => item.severity === "critical" || item.severity === "high")
    ? "HOLD"
    : manuscriptFindings.some((item) => item.severity === "warning")
      ? "REVIEW"
      : "READY";

  return {
    manuscriptId,
    decision,
    reasonCodes: manuscriptFindings.map((item) => item.code),
    reproducibilityScore: scoreFindings(manuscriptFindings)
  };
}

function buildResearchGapOpportunities(manuscripts, findings, policy) {
  const gaps = [];
  manuscripts.forEach((manuscript, index) => {
    const manuscriptId = manuscript.id ?? `manuscript-${index}`;
    const samples = asArray(manuscript.samples);
    const regions = new Set(samples.map((sample) => sample.region).filter(Boolean));
    const broad = asArray(manuscript.claims).some(isBroadClaim);
    const manuscriptFindings = findings.filter((item) => item.manuscriptId === manuscriptId);

    if (broad && regions.size < policy.minRegionsForBroadClaims) {
      gaps.push({
        id: `${manuscriptId}-regional-replication`,
        title: "Prioritize out-of-region replication before broad geographic claims",
        rationale: `${manuscriptId} samples ${regions.size} region(s), below the ${policy.minRegionsForBroadClaims}-region policy for broad claims.`,
        firstAction: "Recruit or simulate a holdout site in the least represented claimed region."
      });
    }

    if (manuscriptFindings.some((item) => item.code === "HIGH_SPATIAL_AUTOCORRELATION_RANDOM_SPLIT")) {
      gaps.push({
        id: `${manuscriptId}-spatial-validation-gap`,
        title: "Add spatial block validation benchmark",
        rationale: "High autocorrelation with random validation means reported accuracy may be optimistic.",
        firstAction: "Create a leave-region-out benchmark and compare it to the random split baseline."
      });
    }
  });
  return gaps;
}

function summarize(status, findings, manuscriptCount, gapCount) {
  if (findings.length === 0) {
    return `${manuscriptCount} manuscript(s) are ready for geospatial peer-review release with no spatial leakage or reproducibility findings.`;
  }

  const counts = countBySeverity(findings);
  return `${status}: ${manuscriptCount} manuscript(s) produced ${findings.length} finding(s): ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.warning ?? 0} warning, and ${gapCount} research gap prompt(s).`;
}

function finding(code, severity, message, evidence, path, remediation, owner, manuscriptId = null, modelId = null) {
  return {
    code,
    severity,
    message,
    evidence,
    path,
    remediation,
    owner,
    manuscriptId,
    modelId
  };
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVIEW";
  }
  return "READY";
}

function scoreFindings(findings) {
  const counts = countBySeverity(findings);
  return Math.max(
    0,
    100 - (counts.critical ?? 0) * 30 - (counts.high ?? 0) * 17 - (counts.warning ?? 0) * 7
  );
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return a.code.localeCompare(b.code);
  });
}

function countBySeverity(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function minimumTrainTestDistanceKm(samples) {
  const train = samples.filter((sample) => String(sample.split ?? "").toLowerCase() === "train");
  const test = samples.filter((sample) => String(sample.split ?? "").toLowerCase() === "test");
  if (train.length === 0 || test.length === 0) {
    return Infinity;
  }

  let minimum = Infinity;
  train.forEach((trainSample) => {
    test.forEach((testSample) => {
      const distance = haversineKm(trainSample.lat, trainSample.lon, testSample.lat, testSample.lon);
      if (distance < minimum) {
        minimum = distance;
      }
    });
  });
  return minimum;
}

function haversineKm(latA, lonA, latB, lonB) {
  const aLat = Number(latA);
  const aLon = Number(lonA);
  const bLat = Number(latB);
  const bLon = Number(lonB);
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) {
    return Infinity;
  }

  const earthRadiusKm = 6371;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const startLat = radians(aLat);
  const endLat = radians(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radians(value) {
  return (value * Math.PI) / 180;
}

function isSpatialSplit(model) {
  const split = String(model.splitStrategy ?? "").toLowerCase();
  return split.includes("spatial") || split.includes("block") || split.includes("leave-site") || split.includes("leave_region");
}

function hasSpatialCovariates(model) {
  return Boolean(model.spatialCovariates) || asArray(model.covariates).length > 0;
}

function isBroadClaim(claim) {
  const scope = String(claim.scope ?? "").toLowerCase();
  const text = String(claim.text ?? "").toLowerCase();
  return (
    ["global", "continental", "multi-region", "national", "deployment"].includes(scope) ||
    text.includes("generalize") ||
    text.includes("across regions") ||
    text.includes("continent") ||
    text.includes("nationwide") ||
    text.includes("global")
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  evaluateGeospatialReviewPacket,
  renderMarkdownReport,
  renderSvgSummary,
  haversineKm
};
