"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

function evaluateSampleCustodyGraph(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateSampleCustodyGraph expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const graph = isPlainObject(packet.graph) ? packet.graph : {};
  const policy = isPlainObject(packet.policy) ? packet.policy : {};
  const samples = asArray(packet.samples);
  const findings = [];

  if (!graph.id || !graph.releaseTarget) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_GRAPH",
        "high",
        "Sample custody packet is missing graph id or release target.",
        "Entity-page and recommendation decisions need a stable graph release context.",
        "graph",
        "Attach graph release metadata before custody validation.",
        "graph curator"
      )
    );
  }

  if (samples.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_SAMPLES",
        "high",
        "Sample custody packet has no samples to inspect.",
        "The guard cannot prove quality of sample graph edges without sample nodes.",
        "samples",
        "Attach sample nodes and custody evidence.",
        "graph curator"
      )
    );
  }

  samples.forEach((sample, index) => inspectSample(sample, index, policy, findings));

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const summary = summarize(status, sortedFindings, samples.length);
  const safeEdges = samples
    .filter((sample) => !sortedFindings.some((item) => item.sampleId === sample.id && ["critical", "high"].includes(item.severity)))
    .map((sample) => ({
      sampleId: sample.id,
      publishableEdges: sample.graphEdges ?? [],
      qualityTier: "verified-custody"
    }));
  const heldEdges = samples
    .filter((sample) => sortedFindings.some((item) => item.sampleId === sample.id && ["critical", "high"].includes(item.severity)))
    .map((sample) => ({
      sampleId: sample.id,
      heldEdges: sample.graphEdges ?? [],
      reasonCodes: sortedFindings.filter((item) => item.sampleId === sample.id).map((item) => item.code)
    }));
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    sampleId: item.sampleId ?? null,
    owner: item.owner,
    action: item.remediation
  }));
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        graph,
        policy,
        samples: samples.map((sample) => ({
          id: sample.id,
          collection: sample.collection,
          preservation: sample.preservation,
          custodyEvents: sample.custodyEvents,
          quality: sample.quality,
          graphEdges: sample.graphEdges
        })),
        codes: sortedFindings.map((item) => item.code)
      })
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: now,
    status,
    summary,
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    safeEdges,
    heldEdges,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    "# Sample Custody Quality Graph Guard",
    "",
    `Graph: ${packet.graph?.id ?? "unknown"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Held Edges",
    ""
  ];

  if (result.heldEdges.length === 0) {
    lines.push("- No graph edges were held.");
  } else {
    result.heldEdges.forEach((item) => {
      lines.push(`- ${item.sampleId}: ${item.reasonCodes.join(", ")}`);
    });
  }

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No custody or cold-chain blockers found.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  - Remediation: ${item.remediation}`);
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
  const statusColor = ready ? "#16794c" : result.status === "REVISE" ? "#a15c00" : "#a11b32";
  const holdWidth = Math.min(320, (critical + high) * 60);
  const warningWidth = Math.min(220, warning * 55);
  const readyWidth = ready ? 280 : Math.max(75, 280 - holdWidth);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Sample custody quality graph guard summary">`,
    `<rect width="960" height="540" fill="#111827"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="18" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Sample custody graph guard</text>`,
    `<text x="82" y="164" font-family="Arial, sans-serif" font-size="20" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="220" width="${readyWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + readyWidth}" y="220" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + readyWidth + warningWidth}" y="220" width="${holdWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">EDGES</text>`,
    `<text x="82" y="346" font-family="Arial, sans-serif" font-size="22" fill="#334155">Held sample edges: ${result.heldEdges.length}</text>`,
    `<text x="82" y="386" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${critical + high}</text>`,
    `<text x="82" y="426" font-family="Arial, sans-serif" font-size="22" fill="#334155">Safe sample edges: ${result.safeEdges.length}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectSample(sample, index, policy, findings) {
  const sampleId = sample.id ?? `sample-${index}`;
  const path = `samples[${index}]`;
  const custodyEvents = asArray(sample.custodyEvents).slice().sort((left, right) => timeValue(left.at) - timeValue(right.at));
  const preservation = isPlainObject(sample.preservation) ? sample.preservation : {};
  const collection = isPlainObject(sample.collection) ? sample.collection : {};
  const quality = isPlainObject(sample.quality) ? sample.quality : {};

  if (!sample.id) {
    findings.push(
      finding(
        "SAMPLE_MISSING_ID",
        "high",
        `Sample at index ${index} has no stable id.`,
        "Knowledge graph sample edges need stable sample identifiers.",
        `${path}.id`,
        "Assign a stable sample id before graph publication.",
        "data curator",
        sampleId
      )
    );
  }

  if (!collection.collectedAt || !collection.siteId || !collection.protocolId) {
    findings.push(
      finding(
        "COLLECTION_PROVENANCE_INCOMPLETE",
        "high",
        `${sampleId} is missing collection time, site id, or protocol id.`,
        "Custody quality cannot be evaluated without collection provenance.",
        `${path}.collection`,
        "Attach collection timestamp, site id, and protocol evidence.",
        "field lead",
        sampleId
      )
    );
  }

  if (!preservation.protocolId || !preservation.preservedAt) {
    findings.push(
      finding(
        "PRESERVATION_PROTOCOL_MISSING",
        "high",
        `${sampleId} is missing preservation protocol evidence.`,
        "Samples should not create trusted graph edges without preservation records.",
        `${path}.preservation`,
        "Attach preservation protocol id and timestamp.",
        "biobank curator",
        sampleId
      )
    );
  } else if (collection.collectedAt) {
    const delayHours = (timeValue(preservation.preservedAt) - timeValue(collection.collectedAt)) / 3600000;
    if (delayHours > Number(policy.maxCollectionToPreservationHours ?? 6)) {
      findings.push(
        finding(
          "COLLECTION_TO_PRESERVATION_DELAY",
          "high",
          `${sampleId} waited ${delayHours.toFixed(1)} hours before preservation.`,
          "Long delays can degrade molecular measurements and mislead graph recommendations.",
          `${path}.preservation.preservedAt`,
          "Hold sample edges until degradation impact is reviewed or replacement evidence is supplied.",
          "biobank curator",
          sampleId
        )
      );
    }
  }

  if (custodyEvents.length === 0) {
    findings.push(
      finding(
        "CUSTODY_CHAIN_MISSING",
        "critical",
        `${sampleId} has no chain-of-custody events.`,
        "Graph edges should not trust sample identity without custody evidence.",
        `${path}.custodyEvents`,
        "Attach signed handoff events from collection through analysis.",
        "custody officer",
        sampleId
      )
    );
  } else {
    inspectCustodyEvents(custodyEvents, path, sampleId, findings);
  }

  const tempEvents = asArray(sample.temperatureLog);
  const minTemp = Number(policy.temperatureRangeC?.min ?? -90);
  const maxTemp = Number(policy.temperatureRangeC?.max ?? -60);
  const excursions = tempEvents.filter((event) => Number(event.celsius) < minTemp || Number(event.celsius) > maxTemp);
  if (tempEvents.length === 0) {
    findings.push(
      finding(
        "TEMPERATURE_LOG_MISSING",
        "high",
        `${sampleId} has no cold-chain temperature log.`,
        "Cold-chain evidence protects downstream graph conclusions from degraded samples.",
        `${path}.temperatureLog`,
        "Attach temperature logger evidence before publishing sample edges.",
        "biobank curator",
        sampleId
      )
    );
  } else if (excursions.length > Number(policy.maxTemperatureExcursions ?? 0)) {
    findings.push(
      finding(
        "COLD_CHAIN_TEMPERATURE_EXCURSION",
        "critical",
        `${sampleId} has ${excursions.length} temperature excursion(s) outside policy.`,
        "Temperature excursions can invalidate assay/sample relationships.",
        `${path}.temperatureLog`,
        "Hold graph edges until excursion review and assay impact notes are attached.",
        "quality reviewer",
        sampleId
      )
    );
  }

  if (Number(quality.freezeThawCycles ?? 0) > Number(policy.maxFreezeThawCycles ?? 2)) {
    findings.push(
      finding(
        "FREEZE_THAW_LIMIT_EXCEEDED",
        "high",
        `${sampleId} exceeds the allowed freeze-thaw cycle limit.`,
        "Repeated thawing can degrade sample analytes and invalidate reuse recommendations.",
        `${path}.quality.freezeThawCycles`,
        "Suppress reuse/recommendation edges or attach validated degradation analysis.",
        "quality reviewer",
        sampleId
      )
    );
  }

  if (quality.integrityScore != null && Number(quality.integrityScore) < Number(policy.minIntegrityScore ?? 0.82)) {
    findings.push(
      finding(
        "SAMPLE_INTEGRITY_BELOW_THRESHOLD",
        "high",
        `${sampleId} has integrity score ${quality.integrityScore}, below policy threshold.`,
        "Low-integrity samples should not be recommended as high-confidence evidence.",
        `${path}.quality.integrityScore`,
        "Downgrade or hold sample graph edges until a curator reviews quality evidence.",
        "quality reviewer",
        sampleId
      )
    );
  }

  const missingRequiredEdges = asArray(policy.requiredGraphEdges).filter((edgeType) => !asArray(sample.graphEdges).some((edge) => edge.type === edgeType));
  if (missingRequiredEdges.length > 0) {
    findings.push(
      finding(
        "REQUIRED_SAMPLE_GRAPH_EDGE_MISSING",
        "warning",
        `${sampleId} is missing required graph edge type(s): ${missingRequiredEdges.join(", ")}.`,
        "Entity pages need complete sample-to-protocol/dataset/evidence linkage.",
        `${path}.graphEdges`,
        "Attach the missing edge evidence or mark the sample as partial provenance.",
        "graph curator",
        sampleId
      )
    );
  }
}

function inspectCustodyEvents(custodyEvents, path, sampleId, findings) {
  custodyEvents.forEach((event, eventIndex) => {
    if (!event.at || !event.from || !event.to || !event.signature) {
      findings.push(
        finding(
          "CUSTODY_HANDOFF_INCOMPLETE",
          "high",
          `${sampleId} has an incomplete custody handoff at event ${eventIndex}.`,
          "Each transfer should identify source, recipient, timestamp, and signature.",
          `${path}.custodyEvents[${eventIndex}]`,
          "Complete the signed custody handoff record.",
          "custody officer",
          sampleId
        )
      );
    }
  });

  for (let index = 1; index < custodyEvents.length; index += 1) {
    if (custodyEvents[index - 1].to !== custodyEvents[index].from) {
      findings.push(
        finding(
          "CUSTODY_CHAIN_BREAK",
          "critical",
          `${sampleId} custody chain breaks between events ${index - 1} and ${index}.`,
          "Unexplained custody gaps undermine sample identity and provenance.",
          `${path}.custodyEvents[${index}]`,
          "Insert the missing transfer or hold graph publication for the sample.",
          "custody officer",
          sampleId
        )
      );
    }
  }
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVISE";
  }
  return "READY";
}

function summarize(status, findings, sampleCount) {
  if (status === "READY") {
    return `All ${sampleCount} sample node(s) have custody, preservation, cold-chain, and quality evidence for graph publication.`;
  }
  const counts = countBySeverity(findings);
  return `Sample graph publication is ${status.toLowerCase()} with ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, and ${counts.warning ?? 0} warning finding(s).`;
}

function finding(code, severity, message, impact, path, remediation, owner = "graph curator", sampleId = null) {
  return { code, severity, message, impact, path, remediation, owner, sampleId };
}

function sortFindings(findings) {
  return findings.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return left.code.localeCompare(right.code);
  });
}

function countBySeverity(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function timeValue(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  evaluateSampleCustodyGraph,
  renderMarkdownReport,
  renderSvgSummary
};
