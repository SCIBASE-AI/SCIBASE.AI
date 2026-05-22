function evaluateFunderAwardLineage(packet) {
  const graph = packet.graph || {};
  const reviewDate = parseDate(packet.reviewDate || new Date().toISOString());
  const funders = graph.funders || [];
  const awards = graph.awards || [];
  const projects = graph.projects || [];
  const outputs = graph.outputs || [];
  const blockers = [];
  const warnings = [];
  const readySignals = [];
  const remediationActions = [];

  const funderById = indexById(funders);
  const awardById = indexById(awards);
  const projectById = indexById(projects);

  evaluateAwardRecords(awards, funderById, reviewDate, blockers, warnings, readySignals, remediationActions);
  evaluateProjectAwardEdges(projects, awardById, blockers, warnings, readySignals, remediationActions);
  evaluateOutputFundingEdges(outputs, awardById, projectById, blockers, warnings, readySignals, remediationActions);
  evaluateMandateCoverage(outputs, awards, blockers, warnings, readySignals, remediationActions);
  evaluateRecommendationSafety(graph.recommendations || [], awardById, blockers, warnings, readySignals, remediationActions);

  if (awards.length === 0) {
    warnings.push({
      code: "NO_AWARD_NODES",
      severity: "review",
      message: "Knowledge graph contains no funder award nodes for lineage checks.",
    });
  } else {
    readySignals.push(`${awards.length} award node(s), ${projects.length} project node(s), and ${outputs.length} output node(s) were inspected.`);
  }

  const status = blockers.length > 0 ? "hold" : warnings.length > 0 ? "review" : "ready";

  return {
    graphId: graph.id,
    status,
    blockers,
    warnings,
    readySignals,
    remediationActions: unique(remediationActions),
    reviewerPacket: buildReviewerPacket(graph, status, blockers, warnings, readySignals),
    auditDigest: buildAuditDigest(graph.id, status, blockers, warnings),
  };
}

function evaluateAwardRecords(awards, funderById, reviewDate, blockers, warnings, readySignals, remediationActions) {
  const normalizedAwardIds = new Map();

  for (const award of awards) {
    if (!award.id) {
      blockers.push({
        code: "AWARD_NODE_MISSING_ID",
        severity: "hold",
        message: "Award node lacks a stable graph identifier.",
      });
      remediationActions.push("Assign a stable award node ID before exposing funder lineage.");
      continue;
    }

    const normalized = normalizeAwardNumber(award.awardNumber);
    if (!normalized) {
      blockers.push({
        code: "AWARD_NUMBER_MISSING",
        severity: "hold",
        awardId: award.id,
        message: `${award.label || award.id} lacks a funder award number.`,
      });
      remediationActions.push(`Record the canonical award number for ${award.label || award.id}.`);
    } else if (normalizedAwardIds.has(`${award.funderId}:${normalized}`)) {
      blockers.push({
        code: "DUPLICATE_FUNDER_AWARD_NUMBER",
        severity: "hold",
        awardId: award.id,
        message: `${award.label || award.id} duplicates award number ${award.awardNumber}.`,
      });
      remediationActions.push(`Merge or disambiguate duplicate award number ${award.awardNumber}.`);
    } else {
      normalizedAwardIds.set(`${award.funderId}:${normalized}`, award.id);
    }

    if (!funderById.has(award.funderId)) {
      blockers.push({
        code: "AWARD_FUNDER_NODE_MISSING",
        severity: "hold",
        awardId: award.id,
        message: `${award.label || award.id} references missing funder ${award.funderId || "none"}.`,
      });
      remediationActions.push(`Attach ${award.label || award.id} to a canonical funder node.`);
    }

    if (!award.uri || !isHttpUrl(award.uri)) {
      warnings.push({
        code: "AWARD_URI_MISSING",
        severity: "review",
        awardId: award.id,
        message: `${award.label || award.id} lacks a stable funder or grant URI.`,
      });
      remediationActions.push(`Add a stable funder award URI for ${award.label || award.id}.`);
    }

    if (award.endsAt && parseDate(award.endsAt) < reviewDate && award.active !== false) {
      warnings.push({
        code: "EXPIRED_AWARD_MARKED_ACTIVE",
        severity: "review",
        awardId: award.id,
        message: `${award.label || award.id} ended on ${award.endsAt} but is still marked active.`,
      });
    }

    if ((award.mandates || []).length === 0) {
      warnings.push({
        code: "AWARD_MANDATES_MISSING",
        severity: "review",
        awardId: award.id,
        message: `${award.label || award.id} has no open-access, data, or reporting mandate metadata.`,
      });
    }
  }

  readySignals.push("Award records were checked for canonical funder IDs, award numbers, URIs, dates, and mandates.");
}

function evaluateProjectAwardEdges(projects, awardById, blockers, warnings, readySignals, remediationActions) {
  for (const project of projects) {
    const awardIds = project.awardIds || [];
    if (awardIds.length === 0 && project.funded === true) {
      blockers.push({
        code: "FUNDED_PROJECT_WITHOUT_AWARD_EDGE",
        severity: "hold",
        projectId: project.id,
        message: `${project.title || project.id} is marked funded but has no award edge.`,
      });
      remediationActions.push(`Connect ${project.title || project.id} to the funding award node(s).`);
    }

    for (const awardId of awardIds) {
      if (!awardById.has(awardId)) {
        blockers.push({
          code: "PROJECT_AWARD_EDGE_MISSING_TARGET",
          severity: "hold",
          projectId: project.id,
          message: `${project.title || project.id} references missing award ${awardId}.`,
        });
        remediationActions.push(`Repair or remove the broken award edge ${awardId} on ${project.title || project.id}.`);
      }
    }
  }

  readySignals.push("Project-to-award graph edges were checked for missing targets.");
}

function evaluateOutputFundingEdges(outputs, awardById, projectById, blockers, warnings, readySignals, remediationActions) {
  for (const output of outputs) {
    const project = projectById.get(output.projectId);
    const directAwardIds = output.awardIds || [];
    const inheritedAwardIds = project?.awardIds || [];
    const declaredAwardIds = directAwardIds.length > 0 ? directAwardIds : inheritedAwardIds;

    if (!project) {
      blockers.push({
        code: "OUTPUT_PROJECT_EDGE_MISSING_TARGET",
        severity: "hold",
        outputId: output.id,
        message: `${output.title || output.id} references missing project ${output.projectId || "none"}.`,
      });
      remediationActions.push(`Attach ${output.title || output.id} to a valid project node.`);
    }

    if (output.fundingStatementRequired && declaredAwardIds.length === 0) {
      blockers.push({
        code: "OUTPUT_FUNDING_STATEMENT_MISSING_AWARD",
        severity: "hold",
        outputId: output.id,
        message: `${output.title || output.id} requires a funding statement but no award is linked.`,
      });
      remediationActions.push(`Add award lineage to ${output.title || output.id} before recommendations or export.`);
    }

    for (const awardId of declaredAwardIds) {
      if (!awardById.has(awardId)) {
        blockers.push({
          code: "OUTPUT_AWARD_EDGE_MISSING_TARGET",
          severity: "hold",
          outputId: output.id,
          message: `${output.title || output.id} references missing award ${awardId}.`,
        });
      }
    }

    if (output.fundingText) {
      const missingTextAwards = declaredAwardIds.filter((awardId) => !containsAward(output.fundingText, awardById.get(awardId)?.awardNumber));
      if (missingTextAwards.length > 0) {
        warnings.push({
          code: "FUNDING_TEXT_AWARD_MISMATCH",
          severity: "review",
          outputId: output.id,
          message: `${output.title || output.id} funding text does not mention linked award(s): ${missingTextAwards.join(", ")}.`,
        });
      }
    }
  }

  readySignals.push("Output funding statements and inherited project award edges were checked.");
}

function evaluateMandateCoverage(outputs, awards, blockers, warnings, readySignals, remediationActions) {
  const awardById = indexById(awards);

  for (const output of outputs) {
    const awardIds = output.awardIds || [];
    for (const awardId of awardIds) {
      const award = awardById.get(awardId);
      if (!award) continue;

      const mandates = new Set((award.mandates || []).map(normalizeToken));
      if (mandates.has("open-access") && output.openAccess !== true) {
        blockers.push({
          code: "OPEN_ACCESS_MANDATE_UNMET",
          severity: "hold",
          outputId: output.id,
          message: `${output.title || output.id} is linked to ${award.label || award.id} but is not marked open access.`,
        });
        remediationActions.push(`Satisfy or explain the open-access mandate for ${output.title || output.id}.`);
      }

      if (mandates.has("data-sharing") && output.dataAvailability !== "public") {
        warnings.push({
          code: "DATA_SHARING_MANDATE_NEEDS_REVIEW",
          severity: "review",
          outputId: output.id,
          message: `${output.title || output.id} is linked to a data-sharing award but data availability is ${output.dataAvailability || "not stated"}.`,
        });
      }

      if (mandates.has("funder-reporting") && !output.reportingExportReady) {
        warnings.push({
          code: "FUNDER_REPORTING_EXPORT_NOT_READY",
          severity: "review",
          outputId: output.id,
          message: `${output.title || output.id} needs funder reporting export metadata.`,
        });
      }
    }
  }

  readySignals.push("Award mandates were compared against output open-access, data, and reporting metadata.");
}

function evaluateRecommendationSafety(recommendations, awardById, blockers, warnings, readySignals, remediationActions) {
  for (const recommendation of recommendations) {
    const award = awardById.get(recommendation.awardId);
    if (!award) {
      blockers.push({
        code: "RECOMMENDATION_AWARD_MISSING",
        severity: "hold",
        recommendationId: recommendation.id,
        message: `Recommendation ${recommendation.id} references missing award ${recommendation.awardId}.`,
      });
      remediationActions.push(`Remove or repair recommendation ${recommendation.id}.`);
      continue;
    }

    if (recommendation.reason === "funder-affinity" && !recommendation.explanation) {
      warnings.push({
        code: "FUNDER_AFFINITY_EXPLANATION_MISSING",
        severity: "review",
        recommendationId: recommendation.id,
        message: `Recommendation ${recommendation.id} uses funder affinity without an explanation.`,
      });
    }

    if (award.active === false && recommendation.visible) {
      blockers.push({
        code: "INACTIVE_AWARD_USED_IN_VISIBLE_RECOMMENDATION",
        severity: "hold",
        recommendationId: recommendation.id,
        message: `Recommendation ${recommendation.id} is visible but uses inactive award ${award.id}.`,
      });
      remediationActions.push(`Hide recommendation ${recommendation.id} or update the award lineage.`);
    }
  }

  if (recommendations.length > 0) {
    readySignals.push(`${recommendations.length} funder-aware recommendation(s) were checked for award lineage safety.`);
  }
}

function buildReviewerPacket(graph, status, blockers, warnings, readySignals) {
  return {
    graphTitle: graph.title,
    status,
    requiredDecision: status === "hold" ? "hold_graph_export" : status === "review" ? "lineage_review" : "release_graph",
    blockerCodes: blockers.map((blocker) => blocker.code),
    warningCodes: warnings.map((warning) => warning.code),
    readySignals,
  };
}

function buildAuditDigest(graphId, status, blockers, warnings) {
  const blockerCodes = blockers.map((blocker) => blocker.code).sort().join("|") || "none";
  const warningCodes = warnings.map((warning) => warning.code).sort().join("|") || "none";
  return `${graphId || "graph"}:${status}:B=${blockerCodes}:W=${warningCodes}`;
}

function indexById(items) {
  return new Map((items || []).filter((item) => item.id).map((item) => [item.id, item]));
}

function normalizeAwardNumber(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "");
}

function containsAward(text, awardNumber) {
  if (!awardNumber) return false;
  return normalizeAwardNumber(text).includes(normalizeAwardNumber(awardNumber));
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || ""));
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  evaluateFunderAwardLineage,
};
