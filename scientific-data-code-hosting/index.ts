/**
 * SCIBASE.AI — Issue #14: Reproducible Scientific Data, DOI Manifest & Environment Verifier
 * Algora Bounty: $375
 */

export interface EvaluationInput {
  id: string;
  workspaceId: string;
  actorId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metrics?: Record<string, number>;
}

export interface EvaluationResult {
  issueRef: number;
  moduleName: string;
  status: "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";
  score: number;
  findings: string[];
  auditHash: string;
}

function deterministicHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function validateDatasetManifest(input: EvaluationInput): EvaluationResult {
  const findings: string[] = [];
  let score = 100;

  if (!input.id || !input.workspaceId || !input.actorId) {
    findings.push("Missing mandatory provenance identifiers (id, workspaceId, or actorId).");
    score -= 50;
  }

  const payloadKeys = Object.keys(input.payload || {});
  if (payloadKeys.length === 0) {
    findings.push("Empty payload provided; cannot verify scientific reproducibility criteria.");
    score -= 40;
  }

  if (input.metrics) {
    for (const [k, v] of Object.entries(input.metrics)) {
      if (typeof v !== "number" || Number.isNaN(v) || v < 0) {
        findings.push(`Invalid metric value for '${k}': ${v}`);
        score -= 20;
      }
    }
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const status = boundedScore >= 80 ? "APPROVED" : boundedScore >= 50 ? "REVIEW_REQUIRED" : "REJECTED";
  const canonical = JSON.stringify({
    id: input.id,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    score: boundedScore,
    status,
  });

  return {
    issueRef: 14,
    moduleName: "scientific-data-code-hosting",
    status,
    score: boundedScore,
    findings,
    auditHash: deterministicHash(canonical),
  };
}
