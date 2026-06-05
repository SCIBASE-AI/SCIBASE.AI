import { createHash } from "node:crypto";

const HOLD_SIMILARITY_THRESHOLD = 0.82;

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? new Set(normalized.split(" ")) : new Set();
}

export function jaccardSimilarity(left, right) {
  const a = tokenize(left);
  const b = tokenize(right);

  if (a.size === 0 && b.size === 0) {
    return 1;
  }

  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export function hashArtifactDescriptor(artifact) {
  const descriptor = JSON.stringify({
    path: artifact.path ?? "",
    sha256: artifact.sha256 ?? "",
    license: artifact.license ?? "",
    dataset: artifact.dataset ?? ""
  });

  return createHash("sha256").update(descriptor).digest("hex");
}

function findArtifactIssues(submission) {
  const issues = [];

  if (!submission.reproducibilityNote) {
    issues.push("missing reproducibility note");
  }

  for (const artifact of submission.artifacts ?? []) {
    if (!artifact.sha256) {
      issues.push(`missing sha256 for ${artifact.path ?? "artifact"}`);
    }

    if (!artifact.license) {
      issues.push(`missing license for ${artifact.path ?? "artifact"}`);
    }
  }

  if ((submission.artifacts ?? []).length === 0) {
    issues.push("no artifacts declared");
  }

  return issues;
}

function findDuplicateSignals(submissions) {
  const signals = [];

  for (let i = 0; i < submissions.length; i += 1) {
    for (let j = i + 1; j < submissions.length; j += 1) {
      const left = submissions[i];
      const right = submissions[j];

      if (left.teamId === right.teamId) {
        continue;
      }

      const leftHashes = new Set((left.artifacts ?? []).map((artifact) => artifact.sha256).filter(Boolean));
      const rightHashes = new Set((right.artifacts ?? []).map((artifact) => artifact.sha256).filter(Boolean));
      const sharedHashes = [...leftHashes].filter((hash) => rightHashes.has(hash));
      const similarity = jaccardSimilarity(`${left.title} ${left.abstract}`, `${right.title} ${right.abstract}`);

      if (sharedHashes.length > 0 || similarity >= HOLD_SIMILARITY_THRESHOLD) {
        signals.push({
          leftId: left.id,
          rightId: right.id,
          sharedHashes,
          similarity: Number(similarity.toFixed(3))
        });
      }
    }
  }

  return signals;
}

export function evaluateSubmissionProvenance(packet) {
  const submissions = packet.submissions ?? [];
  const duplicateSignals = findDuplicateSignals(submissions);
  const heldIds = new Set(duplicateSignals.flatMap((signal) => [signal.leftId, signal.rightId]));

  const decisions = submissions.map((submission) => {
    const issues = findArtifactIssues(submission);
    const artifactDescriptorHashes = (submission.artifacts ?? []).map(hashArtifactDescriptor);

    if (heldIds.has(submission.id)) {
      return {
        submissionId: submission.id,
        teamId: submission.teamId,
        decision: "hold",
        reasons: ["duplicate or near-duplicate signal requires reviewer triage", ...issues],
        artifactDescriptorHashes
      };
    }

    if (issues.length > 0) {
      return {
        submissionId: submission.id,
        teamId: submission.teamId,
        decision: "revise",
        reasons: issues,
        artifactDescriptorHashes
      };
    }

    return {
      submissionId: submission.id,
      teamId: submission.teamId,
      decision: "release",
      reasons: ["provenance complete and no duplicate signal found"],
      artifactDescriptorHashes
    };
  });

  return {
    challengeId: packet.challengeId,
    generatedAt: packet.generatedAt ?? "demo",
    duplicateSignals,
    decisions,
    summary: {
      release: decisions.filter((decision) => decision.decision === "release").length,
      revise: decisions.filter((decision) => decision.decision === "revise").length,
      hold: decisions.filter((decision) => decision.decision === "hold").length
    }
  };
}

export function renderReviewerReport(result) {
  const lines = [
    `# Provenance Review Report`,
    ``,
    `Challenge: ${result.challengeId}`,
    `Generated: ${result.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    `- Release: ${result.summary.release}`,
    `- Revise: ${result.summary.revise}`,
    `- Hold: ${result.summary.hold}`,
    ``,
    `## Decisions`
  ];

  for (const decision of result.decisions) {
    lines.push(
      ``,
      `### ${decision.submissionId}`,
      ``,
      `- Team: ${decision.teamId}`,
      `- Decision: ${decision.decision}`,
      `- Reasons: ${decision.reasons.join("; ")}`
    );
  }

  return `${lines.join("\n")}\n`;
}
