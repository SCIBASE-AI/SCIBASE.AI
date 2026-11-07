import assert from "node:assert/strict";
import test from "node:test";
import { calculateWorkspaceBilling } from "./index.ts";

test("calculateWorkspaceBilling approves valid scientific workflow payload (#20)", () => {
  const res = calculateWorkspaceBilling({
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

test("calculateWorkspaceBilling flags missing provenance and empty payload (#20)", () => {
  const res = calculateWorkspaceBilling({
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
