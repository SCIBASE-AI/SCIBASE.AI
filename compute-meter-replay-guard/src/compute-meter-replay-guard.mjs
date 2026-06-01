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
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return (end - start) / 36e5;
}

function finding(severity, eventIds, check, evidence, remediation) {
  return { severity, eventIds, check, evidence, remediation };
}

function makeAccountMap(packet) {
  return new Map((packet.accounts || []).map((account) => [account.id, account]));
}

function groupBy(events, keyFn) {
  const grouped = new Map();
  for (const event of events) {
    const key = keyFn(event);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }
  return grouped;
}

function checkEventBasics(packet, accountMap) {
  const findings = [];
  const policy = packet.policy || {};
  const allowedNegativeRoles = new Set(policy.allowedNegativeAdjustmentRoles || []);

  for (const event of packet.events || []) {
    const account = accountMap.get(event.accountId);

    if (!account) {
      findings.push(finding(
        "critical",
        [event.eventId],
        "unknown-account",
        `${event.eventId} references missing account ${event.accountId}.`,
        "Hold billing until the meter event is linked to a valid account record."
      ));
      continue;
    }

    if (!event.idempotencyKey) {
      findings.push(finding(
        "high",
        [event.eventId],
        "missing-idempotency-key",
        `${event.eventId} has no idempotency key.`,
        "Reject or enrich the event before it can create an invoice line."
      ));
    }

    if (!account.allowedMeterSources.includes(event.source)) {
      findings.push(finding(
        "high",
        [event.eventId],
        "unauthorized-meter-source",
        `${event.source} is not an allowed meter source for ${event.accountId}.`,
        "Route the event through an approved metering source or hold billing."
      ));
    }

    if (event.plan !== account.currentPlan) {
      findings.push(finding(
        "high",
        [event.eventId],
        "entitlement-plan-mismatch",
        `${event.eventId} was metered as ${event.plan}, but account ${event.accountId} is on ${account.currentPlan}.`,
        "Reprice the event under the account's active plan or hold invoice release."
      ));
    }

    if (event.usageTokens > account.monthlyQuotaTokens) {
      findings.push(finding(
        "medium",
        [event.eventId],
        "quota-outlier",
        `${event.eventId} reports ${event.usageTokens} tokens against quota ${account.monthlyQuotaTokens}.`,
        "Confirm overage policy before invoice generation."
      ));
    }

    if (new Date(event.receivedAt).getTime() < new Date(event.occurredAt).getTime()) {
      findings.push(finding(
        "medium",
        [event.eventId],
        "timestamp-ordering",
        `${event.eventId} was received before it occurred.`,
        "Normalize source clocks or hold the event from invoice release."
      ));
    }

    if ((event.amountCents || 0) < 0 && !allowedNegativeRoles.has(event.adjustmentRole)) {
      findings.push(finding(
        "critical",
        [event.eventId],
        "unauthorized-negative-adjustment",
        `${event.eventId} applies ${event.amountCents} cents with role ${event.adjustmentRole || "missing"}.`,
        "Require finance or meter-admin approval before applying a negative adjustment."
      ));
    }

    if (event.type === "correction") {
      const ageHours = hoursBetween(event.occurredAt, event.receivedAt);
      if (ageHours > (policy.maxCorrectionAgeHours || 72)) {
        findings.push(finding(
          "high",
          [event.eventId],
          "stale-correction",
          `${event.eventId} correction age is ${ageHours.toFixed(1)} hours.`,
          "Route old corrections through a manual reprice or credit memo review."
        ));
      }
    }
  }

  return findings;
}

function checkDuplicateKeys(packet) {
  const findings = [];
  const policy = packet.policy || {};
  const events = packet.events || [];
  const byKey = groupBy(events, (event) => `${event.accountId}:${event.source}:${event.idempotencyKey}`);

  for (const [, matches] of byKey) {
    if (matches.length < 2) continue;
    const sorted = [...matches].sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    const spanHours = hoursBetween(sorted[0].receivedAt, sorted[sorted.length - 1].receivedAt);
    const severity = spanHours <= (policy.duplicateReplayWindowHours || 24) ? "critical" : "medium";
    findings.push(finding(
      severity,
      sorted.map((event) => event.eventId),
      "duplicate-idempotency-key",
      `Idempotency key ${sorted[0].idempotencyKey} appears ${sorted.length} times over ${spanHours.toFixed(1)} hours.`,
      "Bill only the first accepted event and quarantine replay duplicates before invoice lines are generated."
    ));
  }

  const byInvoiceLine = groupBy(events, (event) => event.invoiceLineId);
  for (const [invoiceLineId, matches] of byInvoiceLine) {
    if (matches.length < 2) continue;
    findings.push(finding(
      "critical",
      matches.map((event) => event.eventId),
      "duplicate-invoice-line",
      `Invoice line ${invoiceLineId} is referenced by ${matches.length} events.`,
      "Hold the invoice run and regenerate invoice-line mapping from accepted meter events."
    ));
  }

  return findings;
}

function checkSequences(packet) {
  const findings = [];
  const byStream = groupBy(packet.events || [], (event) => `${event.accountId}:${event.source}`);

  for (const [stream, events] of byStream) {
    const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const gap = current.sequence - previous.sequence;
      if (gap > 1) {
        findings.push(finding(
          "high",
          [previous.eventId, current.eventId],
          "source-sequence-gap",
          `${stream} jumps from sequence ${previous.sequence} to ${current.sequence}.`,
          "Check replay source logs for missing usage before releasing invoice totals."
        ));
      }
    }
  }

  return findings;
}

function summarizeDecision(findings) {
  const counts = findings.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});

  let decision = "invoice";
  if ((counts.critical || 0) > 0) {
    decision = "hold";
  } else if ((counts.high || 0) > 0 || (counts.medium || 0) >= 3) {
    decision = "reprice";
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

function makeFinancePrompts(findings) {
  const checks = new Set(findings.map((item) => item.check));
  const prompts = [];
  if (checks.has("duplicate-idempotency-key") || checks.has("duplicate-invoice-line")) {
    prompts.push("Which replay jobs can create duplicate invoice lines, and where should idempotency be enforced?");
  }
  if (checks.has("source-sequence-gap")) {
    prompts.push("Which meter source logs prove whether missing sequence numbers represent lost usage or skipped test events?");
  }
  if (checks.has("stale-correction") || checks.has("unauthorized-negative-adjustment")) {
    prompts.push("Which correction approvals should route to credit memo review instead of automatic invoice repricing?");
  }
  if (checks.has("entitlement-plan-mismatch")) {
    prompts.push("Which account plan snapshot should be used as the billable source of truth for this invoice run?");
  }
  return prompts;
}

export function analyzePacket(packet) {
  const accountMap = makeAccountMap(packet);
  const findings = [
    ...checkEventBasics(packet, accountMap),
    ...checkDuplicateKeys(packet),
    ...checkSequences(packet)
  ];
  const summary = summarizeDecision(findings);

  return {
    runId: packet.runId,
    title: packet.title,
    generatedAt: packet.generatedAt,
    assistant: "compute-meter-replay-guard",
    decision: summary.decision,
    severityCounts: summary.counts,
    findings: findings.sort((a, b) => {
      return (SEVERITY_SCORE[b.severity] || 0) - (SEVERITY_SCORE[a.severity] || 0)
        || a.check.localeCompare(b.check);
    }),
    financePrompts: makeFinancePrompts(findings)
  };
}

export function renderMarkdown(report) {
  const lines = [
    `# Compute Meter Replay Guard - ${report.runId}`,
    "",
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
    lines.push(`- Events: ${item.eventIds.join(", ")}`);
    lines.push(`- Evidence: ${item.evidence}`);
    lines.push(`- Remediation: ${item.remediation}`);
    lines.push("");
  }

  lines.push("## Finance Prompts");
  lines.push("");
  for (const prompt of report.financePrompts) {
    lines.push(`- ${prompt}`);
  }
  lines.push("");

  return lines.join("\n");
}

function runCli() {
  const [, scriptPath, fixturePath, , format = "json"] = process.argv;
  if (!fixturePath || !scriptPath.endsWith("compute-meter-replay-guard.mjs")) return;

  const packet = JSON.parse(fs.readFileSync(path.resolve(fixturePath), "utf8"));
  const report = analyzePacket(packet);
  if (format === "markdown") {
    process.stdout.write(renderMarkdown(report));
  } else {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
}

runCli();
