import { createHash } from "node:crypto";
export { CHALLENGE_TEMPLATES, ScientificBountySystem } from "./system.js";

const HOLD_SIMILARITY_THRESHOLD = 0.82;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSha256(value) {
  const candidate = String(value ?? "").trim().toLowerCase();
  return SHA256_PATTERN.test(candidate) ? candidate : "";
}

function markdownInline(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim() || "(missing)";
}

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
    path: String(artifact.path ?? "").trim(),
    sha256: normalizeSha256(artifact.sha256),
    license: String(artifact.license ?? "").trim(),
    dataset: String(artifact.dataset ?? "").trim()
  });

  return createHash("sha256").update(descriptor).digest("hex");
}

function findArtifactIssues(submission, duplicateIds) {
  const issues = [];

  if (!hasText(submission.id)) {
    issues.push("missing submission id");
  } else if (duplicateIds.has(submission.id.trim())) {
    issues.push(`duplicate submission id ${submission.id.trim()}`);
  }

  if (!hasText(submission.teamId)) {
    issues.push("missing team id");
  }

  if (!hasText(submission.title)) {
    issues.push("missing title");
  }

  if (!hasText(submission.abstract)) {
    issues.push("missing abstract");
  }

  if (!hasText(submission.reproducibilityNote)) {
    issues.push("missing reproducibility note");
  }

  const artifacts = Array.isArray(submission.artifacts) ? submission.artifacts : [];
  for (const [index, artifact] of artifacts.entries()) {
    const label = hasText(artifact.path) ? artifact.path.trim() : `artifact ${index + 1}`;

    if (!hasText(artifact.path)) {
      issues.push(`missing path for ${label}`);
    }

    if (!normalizeSha256(artifact.sha256)) {
      issues.push(`invalid or missing sha256 for ${label}`);
    }

    if (!hasText(artifact.license)) {
      issues.push(`missing license for ${label}`);
    }

    if (!hasText(artifact.dataset)) {
      issues.push(`missing dataset for ${label}`);
    }
  }

  if (artifacts.length === 0) {
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

      if (hasText(left.teamId) && hasText(right.teamId) && left.teamId.trim() === right.teamId.trim()) {
        continue;
      }

      const leftHashes = new Set(
        (Array.isArray(left.artifacts) ? left.artifacts : [])
          .map((artifact) => normalizeSha256(artifact.sha256))
          .filter(Boolean)
      );
      const rightHashes = new Set(
        (Array.isArray(right.artifacts) ? right.artifacts : [])
          .map((artifact) => normalizeSha256(artifact.sha256))
          .filter(Boolean)
      );
      const sharedHashes = [...leftHashes].filter((hash) => rightHashes.has(hash));
      const leftText = hasText(left.title) && hasText(left.abstract) ? `${left.title} ${left.abstract}` : "";
      const rightText = hasText(right.title) && hasText(right.abstract) ? `${right.title} ${right.abstract}` : "";
      const similarity = leftText && rightText ? jaccardSimilarity(leftText, rightText) : 0;

      if (sharedHashes.length > 0 || similarity >= HOLD_SIMILARITY_THRESHOLD) {
        signals.push({
          leftIndex: i,
          rightIndex: j,
          leftId: hasText(left.id) ? left.id.trim() : `submission-${i + 1}`,
          rightId: hasText(right.id) ? right.id.trim() : `submission-${j + 1}`,
          sharedHashes,
          similarity: Number(similarity.toFixed(3))
        });
      }
    }
  }

  return signals;
}

export function evaluateSubmissionProvenance(packet) {
  const submissions = Array.isArray(packet.submissions) ? packet.submissions : [];
  const idCounts = new Map();

  for (const submission of submissions) {
    if (hasText(submission.id)) {
      const id = submission.id.trim();
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }

  const duplicateIds = new Set(
    [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id)
  );
  const duplicateSignals = findDuplicateSignals(submissions);
  const heldIndexes = new Set(
    duplicateSignals.flatMap((signal) => [signal.leftIndex, signal.rightIndex])
  );

  const decisions = submissions.map((submission, index) => {
    const issues = findArtifactIssues(submission, duplicateIds);
    const artifacts = Array.isArray(submission.artifacts) ? submission.artifacts : [];
    const artifactDescriptorHashes = artifacts.map(hashArtifactDescriptor);
    const submissionId = hasText(submission.id) ? submission.id.trim() : `submission-${index + 1}`;
    const teamId = hasText(submission.teamId) ? submission.teamId.trim() : "(missing)";

    if (heldIndexes.has(index)) {
      return {
        submissionId,
        teamId,
        decision: "hold",
        reasons: ["duplicate or near-duplicate signal requires reviewer triage", ...issues],
        artifactDescriptorHashes
      };
    }

    if (issues.length > 0) {
      return {
        submissionId,
        teamId,
        decision: "revise",
        reasons: issues,
        artifactDescriptorHashes
      };
    }

    return {
      submissionId,
      teamId,
      decision: "release",
      reasons: ["provenance complete and no duplicate signal found"],
      artifactDescriptorHashes
    };
  });

  return {
    challengeId: packet.challengeId,
    generatedAt: packet.generatedAt ?? "unspecified",
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
    `Challenge: ${markdownInline(result.challengeId)}`,
    `Generated: ${markdownInline(result.generatedAt)}`,
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
      `### ${markdownInline(decision.submissionId)}`,
      ``,
      `- Team: ${markdownInline(decision.teamId)}`,
      `- Decision: ${decision.decision}`,
      `- Reasons: ${markdownInline(decision.reasons.join("; "))}`,
      `- Artifact descriptors: ${decision.artifactDescriptorHashes.join(", ") || "none"}`
    );
  }

  lines.push(``, `## Duplicate Signals`, ``);
  if (result.duplicateSignals.length === 0) {
    lines.push(`- None`);
  } else {
    for (const signal of result.duplicateSignals) {
      lines.push(
        `- ${markdownInline(signal.leftId)} ↔ ${markdownInline(signal.rightId)}: similarity ${signal.similarity}; shared SHA-256 ${signal.sharedHashes.join(", ") || "none"}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}
