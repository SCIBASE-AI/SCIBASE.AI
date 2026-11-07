import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBountySubmission } from "./index.ts";

test("evaluateBountySubmission approves valid scientific workflow payload (#18)", () => {
  const res = evaluateBountySubmission({
    id: "item-001",
    workspaceId: "ws-scibase-01",
    actorId: "researcher-01",
    timestamp: "2026-11-07T00:00:00Z",
    payload: { verified: true, version: "1.0.0" },
    metrics: { confidence: 0.96, reproducibility: 0.99 },
  });
  assert.equal(res.status, "APPROVED");
  assert.equal(res.score, 100);
  assert.equal(res.findings.length, 0);
  assert.equal(res.auditHash.length, 8);
});

test("evaluateBountySubmission flags missing provenance and empty payload (#18)", () => {
  const res = evaluateBountySubmission({
    id: "",
    workspaceId: "ws-scibase-01",
    actorId: "",
    timestamp: "2026-11-07T00:00:00Z",
    payload: {},
  });
  assert.equal(res.status, "REJECTED");
  assert.ok(res.score < 50);
  assert.ok(res.findings.length >= 2);
});
