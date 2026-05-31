const crypto = require("crypto");

function buildLookup(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function reason(code, message, evidence) {
  return { code, message, evidence };
}

function normalizeList(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function evidenceItems(edge, evidenceLookup) {
  return normalizeList(edge.evidenceIds).map((id) => evidenceLookup.get(id));
}

function evidenceHasValue(items, key, value) {
  return items.some((item) => item && item[key] === value);
}

function evidenceListContains(items, key, value) {
  return items.some((item) => item && normalizeList(item[key]).includes(value));
}

function evaluateSampleOrganism(edge, source, target, evidence) {
  const blockers = [];
  const warnings = [];

  if (source.type !== "sample" || target.type !== "organism") {
    blockers.push(
      reason("invalid_sample_organism_roles", "sample_of_organism requires sample to organism", {
        sourceType: source.type,
        targetType: target.type,
      })
    );
    return { blockers, warnings };
  }

  if (source.taxonId !== target.taxonId) {
    blockers.push(
      reason("sample_taxon_mismatch", "sample taxon does not match organism node", {
        sampleTaxonId: source.taxonId,
        organismTaxonId: target.taxonId,
      })
    );
  }

  if (!source.voucherId || !evidenceHasValue(evidence, "taxonId", target.taxonId)) {
    warnings.push(
      reason("voucher_evidence_incomplete", "sample organism edge needs voucher evidence", {
        voucherId: source.voucherId || "missing",
        targetTaxonId: target.taxonId,
      })
    );
  }

  return { blockers, warnings };
}

function evaluateStrainSpecies(edge, source, target, evidence) {
  const blockers = [];
  const warnings = [];

  if (source.type !== "strain" || target.type !== "organism") {
    blockers.push(
      reason("invalid_strain_species_roles", "strain_of_species requires strain to organism", {
        sourceType: source.type,
        targetType: target.type,
      })
    );
    return { blockers, warnings };
  }

  if (source.parentTaxonId !== target.taxonId) {
    blockers.push(
      reason("strain_parent_taxon_mismatch", "strain parent taxon does not match organism node", {
        strainParentTaxonId: source.parentTaxonId,
        organismTaxonId: target.taxonId,
      })
    );
  }

  if (!evidenceHasValue(evidence, "parentTaxonId", source.parentTaxonId)) {
    warnings.push(
      reason("strain_registry_evidence_missing", "strain parent evidence is missing", {
        strainId: source.id,
      })
    );
  }

  return { blockers, warnings };
}

function evaluatePathogenHost(edge, source, target, evidence) {
  const blockers = [];
  const warnings = [];

  if (source.type !== "pathogen" || target.type !== "organism") {
    blockers.push(
      reason("invalid_pathogen_host_roles", "pathogen_in_host requires pathogen to host organism", {
        sourceType: source.type,
        targetType: target.type,
      })
    );
    return { blockers, warnings };
  }

  const supportedHosts = normalizeList(source.supportedHostTaxonIds);
  if (!supportedHosts.includes(target.taxonId)) {
    blockers.push(
      reason("host_taxon_not_supported", "host organism is not supported by pathogen host evidence", {
        pathogenId: source.id,
        targetTaxonId: target.taxonId,
        supportedHostTaxonIds: supportedHosts,
      })
    );
  }

  if (!evidenceListContains(evidence, "supportedHostTaxonIds", target.taxonId)) {
    warnings.push(
      reason("host_range_evidence_missing", "host edge lacks matching host-range evidence", {
        targetTaxonId: target.taxonId,
      })
    );
  }

  return { blockers, warnings };
}

function evaluateCellLineSpecies(edge, source, target, evidence) {
  const blockers = [];
  const warnings = [];

  if (source.type !== "cell_line" || target.type !== "organism") {
    blockers.push(
      reason("invalid_cell_line_species_roles", "cell_line_from_species requires cell line to organism", {
        sourceType: source.type,
        targetType: target.type,
      })
    );
    return { blockers, warnings };
  }

  if (source.speciesTaxonId !== target.taxonId) {
    blockers.push(
      reason("cell_line_species_mismatch", "cell-line species does not match organism node", {
        speciesTaxonId: source.speciesTaxonId,
        organismTaxonId: target.taxonId,
      })
    );
  }

  if (!source.cultureCollectionId || !evidenceHasValue(evidence, "cultureCollectionId", source.cultureCollectionId)) {
    warnings.push(
      reason("cell_line_registry_missing", "cell-line edge needs culture collection evidence", {
        cultureCollectionId: source.cultureCollectionId || "missing",
      })
    );
  }

  return { blockers, warnings };
}

function evaluateDatasetSample(edge, source, target, evidence) {
  const blockers = [];
  const warnings = [];

  if (source.type !== "dataset" || target.type !== "sample") {
    blockers.push(
      reason("invalid_dataset_sample_roles", "dataset_contains_sample requires dataset to sample", {
        sourceType: source.type,
        targetType: target.type,
      })
    );
    return { blockers, warnings };
  }

  if (!source.doi || !evidenceHasValue(evidence, "doi", source.doi)) {
    warnings.push(
      reason("dataset_doi_evidence_missing", "dataset sample edge needs DOI evidence", {
        doi: source.doi || "missing",
      })
    );
  }

  const observedTaxa = normalizeList(target.observedTaxonIds);
  if (observedTaxa.length > 1 && !target.contaminationReview) {
    warnings.push(
      reason("mixed_organism_review_missing", "mixed-organism sample needs contamination or co-culture review", {
        sampleId: target.id,
        observedTaxonIds: observedTaxa,
      })
    );
  }

  return { blockers, warnings };
}

function evaluateTypedEdge(edge, source, target, evidence) {
  if (edge.type === "sample_of_organism") {
    return evaluateSampleOrganism(edge, source, target, evidence);
  }
  if (edge.type === "strain_of_species") {
    return evaluateStrainSpecies(edge, source, target, evidence);
  }
  if (edge.type === "pathogen_in_host") {
    return evaluatePathogenHost(edge, source, target, evidence);
  }
  if (edge.type === "cell_line_from_species") {
    return evaluateCellLineSpecies(edge, source, target, evidence);
  }
  if (edge.type === "dataset_contains_sample") {
    return evaluateDatasetSample(edge, source, target, evidence);
  }
  return {
    blockers: [],
    warnings: [
      reason("unhandled_edge_type", "edge type is not handled by this biological boundary guard", {
        edgeType: edge.type,
      }),
    ],
  };
}

function actionsFor(decision, blockers, warnings) {
  if (decision === "allow") {
    return ["publish biological graph edge", "allow recommendation paths to use this edge"];
  }

  const codes = new Set([...blockers, ...warnings].map((item) => item.code));
  const actions = [];

  if (codes.has("strain_parent_taxon_mismatch")) {
    actions.push("suppress strain edge until parent organism is corrected");
    actions.push("request strain registry evidence from curator");
  }
  if (codes.has("host_taxon_not_supported")) {
    actions.push("suppress host recommendation path");
    actions.push("request host range evidence or mark as experimental model");
  }
  if (codes.has("mixed_organism_review_missing")) {
    actions.push("show dataset path only with contamination review notice");
    actions.push("request co-culture or contamination review evidence");
  }
  if (codes.has("sample_taxon_mismatch") || codes.has("cell_line_species_mismatch")) {
    actions.push("quarantine biological entity page edge");
  }
  if (actions.length === 0) {
    actions.push("route edge to graph curator review");
  }

  return [...new Set(actions)];
}

function evaluateEdge(edge, context) {
  const blockers = [];
  const warnings = [];
  const source = context.entities.get(edge.source);
  const target = context.entities.get(edge.target);
  const evidence = evidenceItems(edge, context.evidence);

  if (!source) {
    blockers.push(reason("missing_source", "edge source node is missing", { source: edge.source }));
  }
  if (!target) {
    blockers.push(reason("missing_target", "edge target node is missing", { target: edge.target }));
  }
  if (normalizeList(edge.evidenceIds).length === 0) {
    warnings.push(reason("missing_evidence_ids", "edge has no evidence identifiers", { edgeId: edge.id }));
  }

  for (const id of normalizeList(edge.evidenceIds)) {
    if (!context.evidence.has(id)) {
      blockers.push(reason("unknown_evidence", "edge references unknown evidence", { evidenceId: id }));
    }
  }

  if (source && target) {
    const typed = evaluateTypedEdge(edge, source, target, evidence);
    blockers.push(...typed.blockers);
    warnings.push(...typed.warnings);
  }

  const decision =
    blockers.length > 0 ? "suppress" : warnings.length > 0 ? "curator_review" : "allow";

  const result = {
    edgeId: edge.id,
    type: edge.type,
    source: edge.source,
    target: edge.target,
    decision,
    blockers,
    warnings,
    actions: actionsFor(decision, blockers, warnings),
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateRecommendation(recommendation, edgeLookup) {
  const blockers = [];
  const warnings = [];
  const path = [];

  for (const edgeId of normalizeList(recommendation.pathEdgeIds)) {
    const edgeDecision = edgeLookup.get(edgeId);
    if (!edgeDecision) {
      blockers.push(reason("missing_path_edge", "recommendation references missing edge", { edgeId }));
      continue;
    }
    path.push({
      edgeId,
      decision: edgeDecision.decision,
      auditDigest: edgeDecision.auditDigest,
    });
    if (edgeDecision.decision === "suppress") {
      blockers.push(
        reason("path_contains_suppressed_edge", "recommendation uses a suppressed biological edge", {
          edgeId,
        })
      );
    }
    if (edgeDecision.decision === "curator_review") {
      warnings.push(
        reason("path_contains_review_edge", "recommendation uses an edge requiring curator review", {
          edgeId,
        })
      );
    }
  }

  const decision =
    blockers.length > 0 ? "suppress" : warnings.length > 0 ? "show_with_notice" : "show";

  const result = {
    recommendationId: recommendation.id,
    label: recommendation.label,
    decision,
    path,
    blockers,
    warnings,
    actions:
      decision === "show"
        ? ["show biological graph recommendation"]
        : ["suppress or annotate recommendation until biological boundary review completes"],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function inspectOrganismBoundaryGraph(graph) {
  const context = {
    entities: buildLookup(graph.entities),
    evidence: buildLookup(graph.evidence),
  };
  const edgeDecisions = normalizeList(graph.edges).map((edge) => evaluateEdge(edge, context));
  const edgeLookup = new Map(edgeDecisions.map((item) => [item.edgeId, item]));
  const recommendationDecisions = normalizeList(graph.recommendations).map((recommendation) =>
    evaluateRecommendation(recommendation, edgeLookup)
  );

  const summary = {
    graphId: graph.graphId,
    generatedAt: graph.generatedAt,
    entityCount: normalizeList(graph.entities).length,
    edgeCount: edgeDecisions.length,
    edgeAllow: edgeDecisions.filter((item) => item.decision === "allow").length,
    edgeReview: edgeDecisions.filter((item) => item.decision === "curator_review").length,
    edgeSuppress: edgeDecisions.filter((item) => item.decision === "suppress").length,
    recommendationCount: recommendationDecisions.length,
    recommendationShow: recommendationDecisions.filter((item) => item.decision === "show").length,
    recommendationNotice: recommendationDecisions.filter((item) => item.decision === "show_with_notice").length,
    recommendationSuppress: recommendationDecisions.filter((item) => item.decision === "suppress").length,
  };

  const packet = {
    generatedAt: graph.generatedAt,
    graphId: graph.graphId,
    summary,
    edgeDecisions,
    recommendationDecisions,
  };

  return {
    ...packet,
    jsonLd: renderJsonLd(packet),
    auditDigest: digest(packet),
  };
}

function renderJsonLd(report) {
  return {
    "@context": {
      scibase: "https://scibase.ai/schema#",
      taxon: "https://www.ncbi.nlm.nih.gov/taxonomy/",
      decision: "scibase:decision",
      blocker: "scibase:blocker",
      warning: "scibase:warning",
    },
    "@type": "scibase:OrganismBoundaryReviewPacket",
    "@id": `scibase:organism-boundary:${report.graphId}`,
    graphId: report.graphId,
    generatedAt: report.generatedAt,
    summary: report.summary,
    edgeDecisions: report.edgeDecisions.map((item) => ({
      "@type": "scibase:OrganismBoundaryEdgeDecision",
      edgeId: item.edgeId,
      decision: item.decision,
      blockers: item.blockers.map((entry) => entry.code),
      warnings: item.warnings.map((entry) => entry.code),
      auditDigest: item.auditDigest,
    })),
    recommendationDecisions: report.recommendationDecisions.map((item) => ({
      "@type": "scibase:OrganismBoundaryRecommendationDecision",
      recommendationId: item.recommendationId,
      decision: item.decision,
      blockers: item.blockers.map((entry) => entry.code),
      warnings: item.warnings.map((entry) => entry.code),
      auditDigest: item.auditDigest,
    })),
  };
}

function renderMarkdownReport(report) {
  const lines = [
    "# Organism Strain Boundary Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Graph: ${report.graphId}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Entities: ${report.summary.entityCount}`,
    `- Edges: ${report.summary.edgeCount}`,
    `- Edge allow: ${report.summary.edgeAllow}`,
    `- Edge curator review: ${report.summary.edgeReview}`,
    `- Edge suppress: ${report.summary.edgeSuppress}`,
    `- Recommendations: ${report.summary.recommendationCount}`,
    `- Recommendation show: ${report.summary.recommendationShow}`,
    `- Recommendation show with notice: ${report.summary.recommendationNotice}`,
    `- Recommendation suppress: ${report.summary.recommendationSuppress}`,
    "",
    "## Edge Decisions",
    "",
  ];

  for (const item of report.edgeDecisions) {
    lines.push(`### ${item.edgeId}`);
    lines.push("");
    lines.push(`- Type: ${item.type}`);
    lines.push(`- Decision: ${item.decision}`);
    lines.push(`- Blockers: ${item.blockers.map((entry) => entry.code).join(", ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.map((entry) => entry.code).join(", ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push(`- Digest: ${item.auditDigest}`);
    lines.push("");
  }

  lines.push("## Recommendation Decisions");
  lines.push("");

  for (const item of report.recommendationDecisions) {
    lines.push(`### ${item.recommendationId}`);
    lines.push("");
    lines.push(`- Label: ${item.label}`);
    lines.push(`- Decision: ${item.decision}`);
    lines.push(`- Path: ${item.path.map((entry) => `${entry.edgeId}:${entry.decision}`).join(", ")}`);
    lines.push(`- Blockers: ${item.blockers.map((entry) => entry.code).join(", ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.map((entry) => entry.code).join(", ") || "none"}`);
    lines.push(`- Digest: ${item.auditDigest}`);
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const cards = [
    ["Entities", report.summary.entityCount, "#355c7d"],
    ["Edges allowed", report.summary.edgeAllow, "#2a9d8f"],
    ["Edges reviewed", report.summary.edgeReview, "#e9c46a"],
    ["Edges suppressed", report.summary.edgeSuppress, "#e76f51"],
    ["Recommendations shown", report.summary.recommendationShow, "#457b9d"],
    ["Recommendations blocked", report.summary.recommendationSuppress, "#b56576"],
  ];

  const cardSvg = cards
    .map(([label, value, color], index) => {
      const x = 72 + (index % 3) * 380;
      const y = 188 + Math.floor(index / 3) * 150;
      return [
        `<rect x="${x}" y="${y}" width="320" height="108" rx="8" fill="#ffffff" stroke="#d7dde5"/>`,
        `<rect x="${x}" y="${y}" width="10" height="108" rx="4" fill="${color}"/>`,
        `<text x="${x + 30}" y="${y + 42}" font-size="24" font-family="Arial" fill="#2f3b4a">${escapeXml(label)}</text>`,
        `<text x="${x + 30}" y="${y + 82}" font-size="38" font-family="Arial" font-weight="700" fill="${color}">${value}</text>`,
      ].join("\n");
    })
    .join("\n");

  const curatorRows = report.edgeDecisions
    .filter((item) => item.decision !== "allow")
    .slice(0, 3)
    .map((item, index) => {
      const y = 545 + index * 32;
      const codes = [...item.blockers, ...item.warnings].map((entry) => entry.code).join(", ");
      return `<text x="82" y="${y}" font-size="21" font-family="Arial" fill="#344054">${escapeXml(item.edgeId)} - ${escapeXml(item.decision)} - ${escapeXml(codes)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f6f8fb"/>
  <rect x="44" y="44" width="1192" height="632" rx="12" fill="#ffffff" stroke="#d7dde5"/>
  <text x="72" y="105" font-size="38" font-family="Arial" font-weight="700" fill="#1d2939">Organism Strain Boundary Guard</text>
  <text x="72" y="145" font-size="22" font-family="Arial" fill="#667085">Graph ${escapeXml(report.graphId)} reviewed at ${escapeXml(report.generatedAt)}</text>
  ${cardSvg}
  <text x="72" y="500" font-size="27" font-family="Arial" font-weight="700" fill="#1d2939">Curator queue</text>
  ${curatorRows}
  <text x="72" y="655" font-size="18" font-family="Arial" fill="#667085">Audit digest ${escapeXml(report.auditDigest.slice(0, 32))}</text>
</svg>`;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = {
  inspectOrganismBoundaryGraph,
  evaluateEdge,
  evaluateRecommendation,
  renderJsonLd,
  renderMarkdownReport,
  renderSvgReport,
  digest,
};
