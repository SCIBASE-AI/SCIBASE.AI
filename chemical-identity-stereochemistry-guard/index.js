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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function inchiSkeleton(inchiKey) {
  const value = String(inchiKey || "").trim().toUpperCase();
  return value.includes("-") ? value.split("-")[0] : value;
}

function hasStereoToken(smiles) {
  return /[@/\\]/.test(String(smiles || ""));
}

function synonymKey(value) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function evidenceOk(evidence) {
  return evidence && evidence.doi && /^10\.\d{4,9}\//.test(String(evidence.doi)) && evidence.sourceType;
}

function nodeById(nodes) {
  return new Map(asArray(nodes).map((node) => [node.id, node]));
}

function evaluateChemicalNode(node, packet, policy, findings) {
  const refs = [node.id || "compound"];
  const actions = [];

  if (!node.inchiKey || !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(String(node.inchiKey))) {
    addFinding(
      findings,
      "high",
      "INCHIKEY_FORMAT_INVALID",
      `${node.id || "Compound"} has missing or invalid InChIKey evidence.`,
      refs,
      "attach_valid_inchikey_before_graph_merge"
    );
    actions.push("attach_valid_inchikey_before_graph_merge");
  }

  if (!node.isomericSmiles) {
    addFinding(
      findings,
      "high",
      "ISOMERIC_SMILES_MISSING",
      `${node.id || "Compound"} lacks an isomeric SMILES string.`,
      refs,
      "attach_isomeric_smiles_before_recommendation"
    );
    actions.push("attach_isomeric_smiles_before_recommendation");
  }

  if (node.requiresStereochemistry === true && !hasStereoToken(node.isomericSmiles)) {
    addFinding(
      findings,
      "critical",
      "STEREOCHEMISTRY_MISSING",
      `${node.id || "Compound"} requires stereochemistry but the graph node has no stereochemical markers.`,
      refs,
      "split_or_hold_compound_until_stereochemistry_is_explicit"
    );
    actions.push("split_or_hold_compound_until_stereochemistry_is_explicit");
  }

  if (node.form && node.parentCompoundId && normalize(node.form) !== "freebase") {
    const parent = asArray(packet.compounds).find((candidate) => candidate.id === node.parentCompoundId);
    if (parent && inchiSkeleton(parent.inchiKey) === inchiSkeleton(node.inchiKey) && normalize(parent.form) === "freebase") {
      addFinding(
        findings,
        "medium",
        "SALT_FORM_NEEDS_SEPARATE_NODE",
        `${node.id || "Compound"} is a ${node.form} form that should not be silently merged with the freebase node.`,
        refs.concat([parent.id]),
        "retain_salt_or_hydrate_form_as_explicit_graph_node"
      );
      actions.push("retain_salt_or_hydrate_form_as_explicit_graph_node");
    }
  }

  if (node.isotopeLabeled === true && !node.isotopeLabel) {
    addFinding(
      findings,
      "high",
      "ISOTOPE_LABEL_MISSING",
      `${node.id || "Compound"} is isotope-labeled but has no isotope label metadata.`,
      refs,
      "attach_isotope_label_before_assay_edge_publication"
    );
    actions.push("attach_isotope_label_before_assay_edge_publication");
  }

  if (!evidenceOk(node.evidence)) {
    addFinding(
      findings,
      "high",
      "CHEMICAL_IDENTITY_EVIDENCE_MISSING",
      `${node.id || "Compound"} lacks DOI-backed identity evidence.`,
      refs,
      "attach_doi_backed_identity_evidence"
    );
    actions.push("attach_doi_backed_identity_evidence");
  }

  const synonymMap = new Map();
  for (const synonym of asArray(node.synonyms)) {
    const key = synonymKey(synonym);
    if (!key) {
      continue;
    }
    synonymMap.set(key, (synonymMap.get(key) || 0) + 1);
  }
  for (const [key, count] of synonymMap.entries()) {
    if (count > 1) {
      addFinding(
        findings,
        "low",
        "DUPLICATE_NODE_SYNONYM",
        `${node.id || "Compound"} repeats synonym key ${key}.`,
        refs,
        "deduplicate_compound_synonyms"
      );
      actions.push("deduplicate_compound_synonyms");
    }
  }

  return {
    id: node.id,
    label: node.label || node.id,
    status: actions.some((action) => action.includes("hold") || action.includes("split")) ? "hold_identity_node" : actions.length > 0 ? "curator_review" : "publishable",
    actions: [...new Set(actions)]
  };
}

function evaluateSynonymCollisions(compounds, findings) {
  const owners = new Map();
  for (const node of asArray(compounds)) {
    for (const synonym of asArray(node.synonyms)) {
      const key = synonymKey(synonym);
      if (!key) {
        continue;
      }
      if (!owners.has(key)) {
        owners.set(key, []);
      }
      owners.get(key).push(node);
    }
  }

  for (const [key, nodes] of owners.entries()) {
    const skeletons = new Set(nodes.map((node) => inchiSkeleton(node.inchiKey)).filter(Boolean));
    if (nodes.length > 1 && skeletons.size > 1) {
      addFinding(
        findings,
        "critical",
        "SYNONYM_COLLISION_ACROSS_COMPOUNDS",
        `Synonym ${key} resolves to multiple chemical skeletons.`,
        nodes.map((node) => node.id),
        "quarantine_synonym_until_curator_disambiguates_compounds"
      );
    }
  }
}

function evaluateGraphEdge(edge, nodes, policy, findings) {
  const refs = [edge.id || "edge", edge.source, edge.target].filter(Boolean);
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  const actions = [];

  if (!source || (!target && edge.relationship !== "tested_in_assay")) {
    addFinding(
      findings,
      "critical",
      "CHEMICAL_EDGE_NODE_MISSING",
      `${edge.id || "Edge"} references a missing chemical node.`,
      refs,
      "block_edge_until_both_chemical_nodes_exist"
    );
    actions.push("block_edge_until_both_chemical_nodes_exist");
    return { id: edge.id, status: "hold_graph_edge", actions };
  }

  if (edge.relationship === "same_as") {
    const sameSkeleton = inchiSkeleton(source.inchiKey) === inchiSkeleton(target.inchiKey);
    if (!sameSkeleton) {
      addFinding(
        findings,
        "critical",
        "SAME_AS_SKELETON_MISMATCH",
        `${edge.id || "Edge"} marks two different chemical skeletons as same_as.`,
        refs,
        "split_same_as_edge_into_distinct_compound_nodes"
      );
      actions.push("split_same_as_edge_into_distinct_compound_nodes");
    }
    if (normalize(source.form) !== normalize(target.form) && policy.mergeSaltForms !== true) {
      addFinding(
        findings,
        "medium",
        "SAME_AS_FORM_CONFLATION",
        `${edge.id || "Edge"} conflates ${source.form || "unspecified"} and ${target.form || "unspecified"} forms.`,
        refs,
        "model_compound_form_relationship_instead_of_same_as"
      );
      actions.push("model_compound_form_relationship_instead_of_same_as");
    }
    if (source.requiresStereochemistry || target.requiresStereochemistry) {
      if (source.isomericSmiles !== target.isomericSmiles) {
        addFinding(
          findings,
          "high",
          "SAME_AS_STEREOCHEMISTRY_MISMATCH",
          `${edge.id || "Edge"} links stereochemically distinct compound records.`,
          refs,
          "hold_same_as_edge_for_stereochemistry_review"
        );
        actions.push("hold_same_as_edge_for_stereochemistry_review");
      }
    }
  }

  if (edge.relationship === "tested_in_assay") {
    if (!edge.assayContext || !edge.assayContext.matrix || !edge.assayContext.concentrationUnit) {
      addFinding(
        findings,
        "high",
        "ASSAY_CONTEXT_INCOMPLETE",
        `${edge.id || "Edge"} lacks assay matrix or concentration-unit context.`,
        refs,
        "attach_assay_context_before_recommendation"
      );
      actions.push("attach_assay_context_before_recommendation");
    }
    if (edge.assayContext && edge.assayContext.compatibleForms && !asArray(edge.assayContext.compatibleForms).map(normalize).includes(normalize(source.form || "freebase"))) {
      addFinding(
        findings,
        "medium",
        "ASSAY_FORM_CONTEXT_MISMATCH",
        `${edge.id || "Edge"} uses a compound form that is incompatible with the assay context.`,
        refs,
        "suppress_assay_recommendation_until_form_context_matches"
      );
      actions.push("suppress_assay_recommendation_until_form_context_matches");
    }
  }

  if (!evidenceOk(edge.evidence)) {
    addFinding(
      findings,
      "high",
      "EDGE_EVIDENCE_DOI_MISSING",
      `${edge.id || "Edge"} lacks DOI-backed relationship evidence.`,
      refs,
      "attach_doi_backed_edge_evidence"
    );
    actions.push("attach_doi_backed_edge_evidence");
  }

  return {
    id: edge.id,
    relationship: edge.relationship,
    status: actions.some((action) => action.includes("block") || action.includes("hold") || action.includes("split")) ? "hold_graph_edge" : actions.length > 0 ? "curator_review" : "publishable",
    actions: [...new Set(actions)]
  };
}

function evaluateChemicalIdentityGraph(packet) {
  const findings = [];
  const policy = {
    mergeSaltForms: false,
    ...(packet.policy || {})
  };
  const nodeMap = nodeById(packet.compounds);
  const compoundSummaries = asArray(packet.compounds).map((node) => evaluateChemicalNode(node, packet, policy, findings));
  evaluateSynonymCollisions(packet.compounds, findings);
  const edgeSummaries = asArray(packet.edges).map((edge) => evaluateGraphEdge(edge, nodeMap, policy, findings));

  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const highOrCriticalFindings = findings.filter((finding) => severityRank(finding.severity) >= severityRank("high")).length;
  const heldNodes = compoundSummaries.filter((node) => node.status === "hold_identity_node").length;
  const heldEdges = edgeSummaries.filter((edge) => edge.status === "hold_graph_edge").length;
  let decision = "publish_chemical_graph";

  if (criticalFindings > 0 || heldNodes > 0 || heldEdges > 0) {
    decision = "hold_chemical_graph";
  } else if (highOrCriticalFindings > 0) {
    decision = "route_to_chemical_curator";
  }

  const auditSubject = {
    graphId: packet.graphId,
    policy,
    compoundSummaries,
    edgeSummaries,
    findingCodes: findings.map((finding) => finding.code).sort()
  };

  return {
    summary: {
      decision,
      graphId: packet.graphId || "chemical-graph",
      compoundsReviewed: compoundSummaries.length,
      edgesReviewed: edgeSummaries.length,
      heldNodes,
      heldEdges,
      findingCount: findings.length,
      criticalFindings,
      highOrCriticalFindings,
      auditDigest: `sha256:${sha256(auditSubject)}`
    },
    compounds: compoundSummaries,
    edges: edgeSummaries,
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code))
  };
}

module.exports = {
  evaluateChemicalIdentityGraph,
  sha256
};
