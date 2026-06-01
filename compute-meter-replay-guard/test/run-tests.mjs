#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzePacket, renderMarkdown } from "../src/compute-meter-replay-guard.mjs";

const fixturePath = path.resolve("compute-meter-replay-guard/fixtures/compute-meter-events.json");
const packet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const report = analyzePacket(packet);

assert.equal(report.assistant, "compute-meter-replay-guard");
assert.equal(report.decision, "hold");
assert.equal(report.severityCounts.critical, 3);
assert.equal(report.severityCounts.high, 4);
assert.equal(report.severityCounts.medium, 1);
assert.ok(report.findings.some((finding) => finding.check === "duplicate-idempotency-key"));
assert.ok(report.findings.some((finding) => finding.check === "duplicate-invoice-line"));
assert.ok(report.findings.some((finding) => finding.check === "unauthorized-negative-adjustment"));
assert.ok(report.findings.some((finding) => finding.check === "entitlement-plan-mismatch"));
assert.ok(report.financePrompts.some((prompt) => prompt.includes("idempotency")));

const markdown = renderMarkdown(report);
assert.match(markdown, /Decision: HOLD/);
assert.match(markdown, /Compute Meter Replay Guard/);
assert.match(markdown, /duplicate-invoice-line/);

const cleanPacket = {
  runId: "REV-CLEAN",
  title: "Clean invoice run",
  generatedAt: "2026-06-01T13:50:00Z",
  policy: {
    duplicateReplayWindowHours: 24,
    maxCorrectionAgeHours: 72,
    allowedNegativeAdjustmentRoles: ["finance-ops"],
    invoiceHoldThresholdCents: 10000
  },
  accounts: [{
    id: "acct-clean",
    currentPlan: "lab-pro",
    allowedMeterSources: ["usage-api"],
    monthlyQuotaTokens: 1000000
  }],
  events: [
    {
      eventId: "E-clean-1",
      accountId: "acct-clean",
      source: "usage-api",
      sequence: 1,
      type: "usage",
      plan: "lab-pro",
      idempotencyKey: "clean:1",
      invoiceLineId: "clean-line-1",
      usageTokens: 250000,
      amountCents: 5000,
      occurredAt: "2026-06-01T01:00:00Z",
      receivedAt: "2026-06-01T01:00:03Z"
    },
    {
      eventId: "E-clean-2",
      accountId: "acct-clean",
      source: "usage-api",
      sequence: 2,
      type: "usage",
      plan: "lab-pro",
      idempotencyKey: "clean:2",
      invoiceLineId: "clean-line-2",
      usageTokens: 100000,
      amountCents: 2000,
      occurredAt: "2026-06-01T02:00:00Z",
      receivedAt: "2026-06-01T02:00:02Z"
    }
  ]
};

const cleanReport = analyzePacket(cleanPacket);
assert.equal(cleanReport.decision, "invoice");
assert.equal(cleanReport.findings.length, 0);

console.log("compute meter replay guard tests passed");
