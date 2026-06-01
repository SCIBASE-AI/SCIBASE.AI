#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SEVERITY_SCORE = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function hoursBetween(startIso, endIso) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 36e5;
}

function finding(severity, sampleId, check, evidence, remediation) {
  return { severity, sampleId, check, evidence, remediation };
}

function eventLabel(event) {
  return `${event.type}@${event.timestamp || "missing-time"}`;
}

function sortEvents(events) {
  return [...(events || [])].sort((a, b) => {
    return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
  });
}

function analyzeSample(sample, packet) {
  const findings = [];
  const policy = packet.policy || {};
  const requiredEvents = policy.requiredEvents || [];
  const events = sortEvents(sample.custodyEvents);
  const eventTypes = new Set(events.map((event) => event.type));

  if (!sample.consentId) {
    findings.push(finding(
      "critical",
      sample.id,
      "consent-link",
      "No consentId is attached to the sample metadata.",
      "Attach a verified consent record or remove this sample from AI-supported conclusions."
    ));
  }

  for (const required of requiredEvents) {
    if (!eventTypes.has(required)) {
      findings.push(finding(
        required === "assay-run" ? "high" : "medium",
        sample.id,
        "required-custody-event",
        `Missing required custody event: ${required}.`,
        `Add a signed ${required} custody event or exclude this sample from release.`
      ));
    }
  }

  for (const event of events) {
    if (!event.actor || !event.signature) {
      findings.push(finding(
        "medium",
        sample.id,
        "handoff-signature",
        `${eventLabel(event)} is missing actor or signature evidence.`,
        "Add a signed handoff record with accountable actor and timestamp."
      ));
    }

    if (typeof event.temperatureCelsius === "number" && sample.storageSpec) {
      const { minCelsius, maxCelsius } = sample.storageSpec;
      const isArchiveFreezer = event.type === "archive" && event.temperatureCelsius < minCelsius;
      if (!isArchiveFreezer && (event.temperatureCelsius < minCelsius || event.temperatureCelsius > maxCelsius)) {
        findings.push(finding(
          "high",
          sample.id,
          "temperature-excursion",
          `${eventLabel(event)} recorded ${event.temperatureCelsius}C outside ${minCelsius}C-${maxCelsius}C.`,
          "Open a QA disposition, document stability impact, and quarantine the sample until resolved."
        ));
      }
    }
  }

  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    const gap = hoursBetween(previous.timestamp, current.timestamp);
    if (gap > (policy.maxTransitGapHours || 4)) {
      findings.push(finding(
        "medium",
        sample.id,
        "custody-time-gap",
        `${previous.type} to ${current.type} gap is ${gap.toFixed(1)} hours.`,
        "Add intermediate courier/storage handoff evidence or downgrade conclusions that rely on this sample."
      ));
    }
  }

  if (sample.blindingGroup && (sample.visibleFields || []).some((field) => /arm|group|treatment/i.test(field))) {
    findings.push(finding(
      "high",
      sample.id,
      "blinding-leak",
      `Reviewer-visible fields include group/arm metadata while blindingGroup=${sample.blindingGroup}.`,
      "Mask treatment-arm fields before AI review or document that the review is intentionally unblinded."
    ));
  }

  const assayEvents = events.filter((event) => event.type === "assay-run");
  for (const assay of assayEvents) {
    if (!assay.instrumentId) {
      findings.push(finding(
        "medium",
        sample.id,
        "instrument-link",
        `${eventLabel(assay)} has no instrumentId.`,
        "Link the assay event to the instrument run and calibration record."
      ));
    }
    if (assay.qcStatus && assay.qcStatus !== "pass") {
      findings.push(finding(
        "critical",
        sample.id,
        "assay-qc",
        `${eventLabel(assay)} has qcStatus=${assay.qcStatus}.`,
        "Do not release conclusions using this assay until QC failure is resolved or rerun."
      ));
    }
  }

  if (sample.quarantine?.status === "open") {
    findings.push(finding(
      "critical",
      sample.id,
      "open-quarantine",
      `Open quarantine: ${sample.quarantine.reason || "reason not provided"}.`,
      "Resolve QA quarantine or remove this sample from conclusions."
    ));
  }

  if (policy.releaseRequiresReviewerSignoff && !sample.reviewerSignoff) {
    findings.push(finding(
      "high",
      sample.id,
      "reviewer-signoff",
      "No reviewerSignoff record is present.",
      "Obtain accountable QA/reviewer signoff before release."
    ));
  }

  return findings;
}

function conclusionFindings(packet, sampleRisk) {
  const findings = [];
  for (const conclusion of packet.conclusions || []) {
    const linkedFindings = (conclusion.sampleIds || []).flatMap((sampleId) => sampleRisk.get(sampleId) || []);
    const maxSeverity = linkedFindings.reduce((max, item) => {
      return Math.max(max, SEVERITY_SCORE[item.severity] || 0);
    }, 0);

    if (maxSeverity >= SEVERITY_SCORE.critical) {
      findings.push(finding(
        "critical",
        conclusion.sampleIds.join(","),
        "conclusion-release-gate",
        `Conclusion ${conclusion.id} relies on sample(s) with critical custody findings.`,
        "Hold this conclusion until critical sample custody issues are resolved."
      ));
    } else if (maxSeverity >= SEVERITY_SCORE.high) {
      findings.push(finding(
        "high",
        conclusion.sampleIds.join(","),
        "conclusion-release-gate",
        `Conclusion ${conclusion.id} relies on sample(s) with high-risk custody findings.`,
        "Revise confidence language and require reviewer acceptance before release."
      ));
    }
  }
  return findings;
}

function summarizeDecision(findings) {
  const counts = findings.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});

  let decision = "release";
  if ((counts.critical || 0) > 0) {
    decision = "hold";
  } else if ((counts.high || 0) > 0 || (counts.medium || 0) >= 3) {
    decision = "revise";
  }

  return {
    decision,
    counts: {
      critical: counts.critical || 0,
      high: counts.high || 0,
      medium: counts.medium || 0,
      low: counts.low || 0
    }
  };
}

function makeGapPrompts(packet, findings) {
  const checks = new Set(findings.map((item) => item.check));
  const prompts = [];
  if (checks.has("temperature-excursion")) {
    prompts.push("Which biomarkers remain stable after the observed cold-chain excursion window?");
  }
  if (checks.has("blinding-leak")) {
    prompts.push("Would blinded AI review change the severity or interpretation of the reported effect?");
  }
  if (checks.has("custody-time-gap")) {
    prompts.push("What courier or intermediate storage metadata should be captured to close shipment evidence gaps?");
  }
  if (checks.has("assay-qc")) {
    prompts.push("Can the failed assay be rerun from archived aliquots, or should the conclusion be limited to unaffected samples?");
  }
  if (prompts.length === 0) {
    prompts.push(`What custody evidence would most improve reviewer confidence for ${packet.projectId}?`);
  }
  return prompts;
}

export function analyzePacket(packet) {
  const perSampleFindings = new Map();
  const findings = [];

  for (const sample of packet.samples || []) {
    const sampleFindings = analyzeSample(sample, packet);
    perSampleFindings.set(sample.id, sampleFindings);
    findings.push(...sampleFindings);
  }

  findings.push(...conclusionFindings(packet, perSampleFindings));
  const summary = summarizeDecision(findings);

  return {
    projectId: packet.projectId,
    title: packet.title,
    generatedAt: packet.generatedAt,
    assistant: "sample-chain-of-custody-review",
    decision: summary.decision,
    severityCounts: summary.counts,
    findings: findings.sort((a, b) => {
      return (SEVERITY_SCORE[b.severity] || 0) - (SEVERITY_SCORE[a.severity] || 0)
        || a.sampleId.localeCompare(b.sampleId)
        || a.check.localeCompare(b.check);
    }),
    researchGapPrompts: makeGapPrompts(packet, findings)
  };
}

export function renderMarkdown(report) {
  const lines = [
    `# Sample Chain-of-Custody Review: ${report.projectId}`,
    "",
    `Title: ${report.title}`,
    `Decision: ${report.decision.toUpperCase()}`,
    "",
    "## Severity Counts",
    "",
    `- Critical: ${report.severityCounts.critical}`,
    `- High: ${report.severityCounts.high}`,
    `- Medium: ${report.severityCounts.medium}`,
    `- Low: ${report.severityCounts.low}`,
    "",
    "## Findings",
    ""
  ];

  for (const item of report.findings) {
    lines.push(`### [${item.severity.toUpperCase()}] ${item.check}`);
    lines.push("");
    lines.push(`- Sample/conclusion: ${item.sampleId}`);
    lines.push(`- Evidence: ${item.evidence}`);
    lines.push(`- Remediation: ${item.remediation}`);
    lines.push("");
  }

  lines.push("## Research Gap Prompts", "");
  for (const prompt of report.researchGapPrompts) {
    lines.push(`- ${prompt}`);
  }
  lines.push("");

  return lines.join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  const inputPath = args.find((arg) => !arg.startsWith("--"));
  const formatIndex = args.indexOf("--format");
  const format = formatIndex >= 0 ? args[formatIndex + 1] : "markdown";
  return { inputPath, format };
}

function main() {
  const { inputPath, format } = parseArgs(process.argv.slice(2));
  if (!inputPath) {
    console.error("Usage: node chain-custody-assistant.mjs <packet.json> [--format markdown|json]");
    process.exit(2);
  }

  const absolutePath = path.resolve(inputPath);
  const packet = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const report = analyzePacket(packet);

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderMarkdown(report));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
