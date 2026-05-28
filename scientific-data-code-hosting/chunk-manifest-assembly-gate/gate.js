"use strict";

function reviewManifests(manifests) {
  return manifests.map(reviewManifest);
}

function reviewManifest(manifest) {
  validateManifest(manifest);

  const sortedChunks = [...manifest.chunks].sort((a, b) => a.start - b.start);
  const findings = [
    ...reviewRanges(manifest, sortedChunks),
    ...reviewDigests(manifest, sortedChunks),
    ...reviewFinalDigest(manifest),
  ];

  return {
    artifactId: manifest.artifactId,
    filename: manifest.filename,
    decision: findings.some((item) => item.severity === "block") ? "block" : "ready",
    findings,
    receipt: buildReceipt(manifest, sortedChunks, findings),
  };
}

function validateManifest(manifest) {
  if (!manifest.artifactId || !manifest.filename) {
    throw new Error("Manifest must include artifactId and filename.");
  }
  if (!Number.isInteger(manifest.declaredSizeBytes) || manifest.declaredSizeBytes <= 0) {
    throw new Error(`${manifest.artifactId} must declare a positive byte size.`);
  }
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error(`${manifest.artifactId} must include chunks.`);
  }
}

function reviewRanges(manifest, chunks) {
  const findings = [];
  let cursor = 0;

  for (const chunk of chunks) {
    if (chunk.start > cursor) {
      findings.push(
        finding(
          "chunk_gap",
          "block",
          chunk.id,
          `${manifest.artifactId} is missing bytes ${cursor}-${chunk.start - 1}.`,
          "Upload or repair the missing chunk range before release.",
        ),
      );
    }

    if (chunk.start < cursor) {
      findings.push(
        finding(
          "chunk_overlap",
          "block",
          chunk.id,
          `${chunk.id} overlaps an earlier chunk at byte ${chunk.start}.`,
          "Replace overlapping chunks with a non-overlapping manifest.",
        ),
      );
    }

    if (chunk.end <= chunk.start) {
      findings.push(
        finding(
          "invalid_chunk_range",
          "block",
          chunk.id,
          `${chunk.id} has invalid byte range ${chunk.start}-${chunk.end}.`,
          "Regenerate chunk boundaries before accepting the upload.",
        ),
      );
    }

    cursor = Math.max(cursor, chunk.end);
  }

  if (cursor !== manifest.declaredSizeBytes) {
    findings.push(
      finding(
        "assembled_size_mismatch",
        "block",
        manifest.artifactId,
        `${manifest.artifactId} assembles to ${cursor} bytes, expected ${manifest.declaredSizeBytes}.`,
        "Reconcile chunk ranges with the declared artifact size.",
      ),
    );
  }

  return findings;
}

function reviewDigests(manifest, chunks) {
  return chunks.flatMap((chunk) => {
    const expected = manifest.digestRegistry?.[chunk.id];
    if (!expected) {
      return [
        finding(
          "missing_chunk_digest",
          "block",
          chunk.id,
          `${chunk.id} has no digest registry entry.`,
          "Add a digest for every chunk before release.",
        ),
      ];
    }
    if (chunk.digest !== expected) {
      return [
        finding(
          "chunk_digest_mismatch",
          "block",
          chunk.id,
          `${chunk.id} digest ${chunk.digest} does not match registry ${expected}.`,
          "Re-upload the chunk or update the registry from a trusted checksum source.",
        ),
      ];
    }
    return [];
  });
}

function reviewFinalDigest(manifest) {
  if (manifest.finalDigest) {
    return [];
  }

  return [
    finding(
      "missing_final_digest",
      "hold",
      manifest.artifactId,
      `${manifest.artifactId} does not include a final artifact digest.`,
      "Attach the assembled artifact digest before public release.",
    ),
  ];
}

function buildReceipt(manifest, chunks, findings) {
  return {
    chunkCount: chunks.length,
    declaredSizeBytes: manifest.declaredSizeBytes,
    assembledEndByte: Math.max(...chunks.map((chunk) => chunk.end)),
    blockedFindings: findings.filter((item) => item.severity === "block").length,
    heldFindings: findings.filter((item) => item.severity === "hold").length,
    nextActions: Array.from(new Set(findings.map((item) => item.action))),
  };
}

function finding(code, severity, target, message, action) {
  return { code, severity, target, message, action };
}

function summarizeReports(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1;
      summary.ready += report.decision === "ready" ? 1 : 0;
      summary.blocked += report.decision === "block" ? 1 : 0;
      summary.findings += report.findings.length;
      return summary;
    },
    { total: 0, ready: 0, blocked: 0, findings: 0 },
  );
}

module.exports = {
  reviewManifest,
  reviewManifests,
  summarizeReports,
};
