const SEVERITY_WEIGHTS = {
  critical: 34,
  high: 22,
  medium: 10,
  low: 4
};

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function daysBetween(a, b) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Math.floor((right - left) / (24 * 60 * 60 * 1000));
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(new Date(value).getTime());
}

function duplicateValues(items, valueForItem) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    const value = valueForItem(item);
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function datasetByDoi(project) {
  return new Map(project.datasets.map((dataset) => [dataset.doi, dataset]));
}

function datasetById(project) {
  return new Map(project.datasets.map((dataset) => [dataset.id, dataset]));
}

function sampleById(project) {
  return new Map(project.samples.map((sample) => [sample.id, sample]));
}

function validateGraphEvidenceIntegrity(project, findings) {
  if (!isValidDate(project.asOfDate)) {
    addFinding(
      findings,
      "critical",
      "graph-packet-date-invalid",
      "The graph packet has no valid as-of date.",
      "Repair the packet timestamp before publishing graph nodes or recommendations.",
      [String(project.asOfDate)]
    );
  }

  const identityCollections = [
    ["dataset", project.datasets],
    ["sample", project.samples],
    ["edge", project.edges]
  ];
  for (const [kind, items] of identityCollections) {
    for (const duplicateId of duplicateValues(items, (item) => item.id)) {
      addFinding(
        findings,
        "critical",
        `${kind}-id-duplicate`,
        `${kind} identifier ${duplicateId} appears more than once.`,
        "Resolve graph identity ambiguity before building nodes or edges.",
        [String(duplicateId)]
      );
    }
  }

  for (const duplicateDoi of duplicateValues(project.datasets, (dataset) => dataset.doi)) {
    addFinding(
      findings,
      "critical",
      "dataset-doi-duplicate",
      `Dataset DOI ${duplicateDoi} resolves to more than one dataset node.`,
      "Deduplicate DOI provenance before resolving sample-to-dataset edges.",
      [String(duplicateDoi)]
    );
  }

  for (const duplicateEdge of duplicateValues(
    project.edges,
    (edge) => `${edge.from}|${edge.predicate}|${edge.to}`
  )) {
    addFinding(
      findings,
      "high",
      "graph-edge-duplicate",
      `Graph relation ${duplicateEdge} appears more than once.`,
      "Deduplicate graph relations before entity-page or recommendation publication.",
      [duplicateEdge]
    );
  }

  for (const sample of project.samples) {
    if (!isValidDate(sample.collectionDate)) {
      addFinding(
        findings,
        "critical",
        "collection-date-invalid",
        `${sample.id} has no valid collection date.`,
        "Repair or quarantine the sample before emitting temporal graph edges.",
        [sample.id, String(sample.collectionDate)]
      );
    }
    if (!project.policy.acceptedCountryBounds[sample.country]) {
      addFinding(
        findings,
        sample.publicRecommendation ? "critical" : "high",
        "country-bounds-unavailable",
        `${sample.id} uses country ${sample.country}, which has no accepted validation bounds.`,
        "Hold location-derived publication until authoritative country bounds are configured.",
        [sample.id, String(sample.country)]
      );
    }
  }
}

function coordinatesInRange(sample) {
  return (
    Number.isFinite(sample.latitude) &&
    Number.isFinite(sample.longitude) &&
    sample.latitude >= -90 &&
    sample.latitude <= 90 &&
    sample.longitude >= -180 &&
    sample.longitude <= 180
  );
}

function countryBoundsMatch(project, sample) {
  const bounds = project.policy.acceptedCountryBounds[sample.country];
  if (!bounds || !coordinatesInRange(sample)) {
    return true;
  }
  return (
    sample.latitude >= bounds.minLat &&
    sample.latitude <= bounds.maxLat &&
    sample.longitude >= bounds.minLon &&
    sample.longitude <= bounds.maxLon
  );
}

function evaluateSample(sample, project, datasetIndex, findings) {
  if (!coordinatesInRange(sample)) {
    addFinding(
      findings,
      "critical",
      "coordinate-range-invalid",
      `${sample.id} has coordinates outside valid latitude/longitude ranges.`,
      "Suppress the sample node and repair coordinates before graph publication.",
      [sample.id]
    );
  }

  if (sample.crs !== project.policy.requiredCrs) {
    addFinding(
      findings,
      "high",
      "coordinate-crs-not-normalized",
      `${sample.id} uses ${sample.crs}, not ${project.policy.requiredCrs}.`,
      "Normalize coordinates to the graph CRS before entity pages or recommendations are shown.",
      [sample.id, sample.crs]
    );
  }

  if (!countryBoundsMatch(project, sample)) {
    addFinding(
      findings,
      "high",
      "country-coordinate-mismatch",
      `${sample.id} coordinates do not fall inside the expected ${sample.country} bounds.`,
      "Hold location-derived graph edges until country and coordinate provenance are reconciled.",
      [sample.id, sample.country]
    );
  }

  const sensitiveLabels = sample.labels.filter((label) => project.policy.sensitiveLabels.includes(label));
  if (sensitiveLabels.length > 0 && sample.precisionDecimals > project.policy.maxPublicPrecisionDecimals) {
    addFinding(
      findings,
      "critical",
      "sensitive-site-overprecise-public-coordinate",
      `${sample.id} exposes ${sample.precisionDecimals} decimal coordinates for ${sensitiveLabels.join(", ")}.`,
      "Round or redact the location before public discovery recommendations are enabled.",
      [sample.id, ...sensitiveLabels]
    );
  }

  if (!sample.voucherId) {
    addFinding(
      findings,
      "high",
      "sample-voucher-missing",
      `${sample.id} has no specimen or field voucher identifier.`,
      "Attach a voucher/specimen accession before the sample appears in entity pages.",
      [sample.id]
    );
  }

  if (!datasetIndex.has(sample.datasetDoi)) {
    addFinding(
      findings,
      "high",
      "sample-dataset-doi-unresolved",
      `${sample.id} references unresolved dataset DOI ${sample.datasetDoi}.`,
      "Repair DOI alignment before graph edges are emitted.",
      [sample.id, sample.datasetDoi]
    );
  }

  if (
    isValidDate(project.asOfDate) &&
    isValidDate(sample.collectionDate) &&
    daysBetween(project.asOfDate, sample.collectionDate) > project.policy.maxCollectionFutureDays
  ) {
    addFinding(
      findings,
      "medium",
      "collection-date-in-future",
      `${sample.id} collection date ${sample.collectionDate} is after the graph packet date.`,
      "Hold temporal graph edges until the collection date is corrected or the packet date advances.",
      [sample.id, sample.collectionDate]
    );
  }

  if (project.policy.publicRecommendationRequiresDatasetDoi && sample.publicRecommendation && !sample.datasetDoi) {
    addFinding(
      findings,
      "high",
      "public-recommendation-without-dataset-doi",
      `${sample.id} is eligible for public recommendations without a dataset DOI.`,
      "Disable public discovery for the sample until dataset DOI provenance is present.",
      [sample.id]
    );
  }
}

function evaluateEdges(project, findings) {
  const samples = sampleById(project);
  const datasets = datasetById(project);
  const sampleDatasetDoi = datasetByDoi(project);

  for (const edge of project.edges) {
    const sample = samples.get(edge.from);
    const dataset = datasets.get(edge.to);
    if (!sample || !dataset) {
      addFinding(
        findings,
        "critical",
        "graph-edge-endpoint-missing",
        `${edge.id} references a missing sample or dataset node.`,
        "Drop the edge until both graph endpoints exist.",
        [edge.id, edge.from, edge.to]
      );
      continue;
    }

    const declaredDataset = sampleDatasetDoi.get(sample.datasetDoi);
    if (!declaredDataset || declaredDataset.id !== dataset.id) {
      addFinding(
        findings,
        "high",
        "sample-dataset-edge-doi-mismatch",
        `${edge.id} links ${sample.id} to ${dataset.id}, but the sample declares ${sample.datasetDoi}.`,
        "Rebuild the graph edge from DOI-resolved dataset metadata.",
        [edge.id, sample.id, dataset.id]
      );
    }
  }
}

function evaluateGeospatialProvenance(project) {
  const findings = [];
  const datasets = datasetByDoi(project);

  validateGraphEvidenceIntegrity(project, findings);

  for (const sample of project.samples) {
    evaluateSample(sample, project, datasets, findings);
  }
  evaluateEdges(project, findings);

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
    return "block-geospatial-graph-publication";
  }
  if (evaluation.severitySummary.high > 0 || evaluation.score < 75) {
    return "hold-geospatial-edges-for-curator-review";
  }
  if (evaluation.score < 90) {
    return "manual-review-before-recommendation";
  }
  return "geospatial-provenance-ready";
}

function buildCuratorActions(findings) {
  return findings.map((finding) => ({
    priority: finding.severity === "critical" || finding.severity === "high" ? "blocking" : "review",
    rule: finding.rule,
    action: finding.action,
    refs: finding.refs
  }));
}

function buildReviewPacket(project) {
  const evaluation = evaluateGeospatialProvenance(project);
  return {
    guard: "geospatial-sample-provenance-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#17",
    graphPacketId: project.graphPacket.id,
    entityPage: project.graphPacket.entityPage,
    recommendationMode: project.graphPacket.recommendationMode,
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    curatorActions: buildCuratorActions(evaluation.findings),
    safety: [
      "Synthetic sample, dataset, coordinate, and graph-edge metadata only",
      "No geocoder, repository, GIS, ontology, specimen, journal, or external API calls",
      "No private field locations, real endangered species data, credentials, or live graph mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Geospatial Sample Provenance Guard",
    "",
    `Issue: ${packet.issue}`,
    `Graph packet: ${packet.graphPacketId}`,
    `Entity page: ${packet.entityPage}`,
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
  const scoreWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Geospatial sample provenance guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Geospatial Sample Provenance Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">${packet.entityPage} graph publication review</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high} | Findings ${packet.findings.length}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Provenance score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${scoreWidth}" height="14" rx="7" fill="#0891b2"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#ecfeff" stroke="#67e8f9"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#155e75">Protect sample-location graph edges</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#155e75">Checks coordinates, CRS, sensitive-site precision, vouchers, DOI alignment, dates, and public safety.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  countryBoundsMatch,
  decisionFromEvaluation,
  evaluateGeospatialProvenance,
  renderMarkdownReport,
  renderSvgSummary
};
