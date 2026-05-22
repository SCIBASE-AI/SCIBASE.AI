const DEFAULT_POLICY = Object.freeze({
  generatedAt: "2026-05-22T00:00:00.000Z",
  maxCpuCores: 16,
  maxMemoryGb: 64,
  maxRuntimeMinutes: 240,
  maxWritableGb: 2,
  allowedEgressModes: ["none", "doi-resolution-only"],
  doiResolverAllowlist: ["api.datacite.org", "doi.org"],
  permittedWritablePrefixes: ["/tmp/scibase-run/"],
  requiredHashPrefix: "sha256:",
});

const REQUIREMENT_MAP = Object.freeze({
  pinned_image: "Computation-aware reproducibility: container support",
  network_policy: "Execution sandboxes: secure runtime validation",
  compute_budget: "Computation-aware reproducibility: controlled execution",
  writable_mounts: "Execution sandboxes: limited mutable state",
  artifact_hashes: "File and metadata versioning: hash-based integrity",
  export_gate: "Programmatic access and export: release bundle guard",
});

function evaluateRepositoryComputePolicy(candidate, policy = DEFAULT_POLICY) {
  assertCandidate(candidate);

  const checks = [];
  const issues = [];
  const addCheck = (pipelineId, code, passed, detail) => {
    checks.push({ pipelineId, code, passed, detail });
  };
  const addIssue = (
    severity,
    pipelineId,
    code,
    message,
    requirement,
    remediation,
  ) => {
    issues.push({
      severity,
      pipelineId,
      code,
      message,
      requirement,
      remediation,
    });
  };

  if (!isHash(candidate.componentManifestHash, policy)) {
    addIssue(
      "error",
      "repository",
      "COMPONENT_MANIFEST_HASH_MISSING",
      "The repository component manifest is missing a deterministic hash.",
      REQUIREMENT_MAP.artifact_hashes,
      "Generate a sha256 component manifest before release or export.",
    );
  }

  if (!isHash(candidate.exportBundleHash, policy)) {
    addIssue(
      "error",
      "repository",
      "EXPORT_BUNDLE_HASH_MISSING",
      "The export bundle is missing a deterministic hash.",
      REQUIREMENT_MAP.export_gate,
      "Build the release bundle and attach its sha256 hash before DOI publication.",
    );
  }

  const pipelines = [...candidate.pipelines].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const pipeline of pipelines) {
    const sandbox = pipeline.sandbox || {};
    const compute = pipeline.compute || {};

    checkPinnedImage(pipeline, sandbox, policy, addCheck, addIssue);
    checkNetworkPolicy(pipeline, sandbox, policy, addCheck, addIssue);
    checkComputeBudget(pipeline, compute, policy, addCheck, addIssue);
    checkWritableMounts(pipeline, sandbox, policy, addCheck, addIssue);
    checkPipelineHashes(pipeline, policy, addCheck, addIssue);
  }

  const blockingIssues = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const status =
    blockingIssues.length > 0
      ? "blocked"
      : warnings.length > 0
        ? "needs_review"
        : "ready";

  return {
    generatedAt: policy.generatedAt,
    repositoryId: candidate.repositoryId,
    tag: candidate.tag,
    doiDraft: candidate.doiDraft,
    status,
    summary: {
      pipelines: pipelines.length,
      checks: checks.length,
      passedChecks: checks.filter((check) => check.passed).length,
      blockingIssues: blockingIssues.length,
      warnings: warnings.length,
    },
    checks,
    issues: issues.sort(compareIssues),
    releaseActions: buildReleaseActions(status, issues),
    requirementCoverage: REQUIREMENT_MAP,
  };
}

function createPolicyReport(candidates, policy = DEFAULT_POLICY) {
  const evaluations = candidates
    .map((candidate) => evaluateRepositoryComputePolicy(candidate, policy))
    .sort((a, b) => a.repositoryId.localeCompare(b.repositoryId));

  return {
    generatedAt: policy.generatedAt,
    guard: "repository-compute-sandbox-policy-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#10",
    totals: {
      candidates: evaluations.length,
      ready: evaluations.filter((item) => item.status === "ready").length,
      needsReview: evaluations.filter((item) => item.status === "needs_review")
        .length,
      blocked: evaluations.filter((item) => item.status === "blocked").length,
      blockingIssues: evaluations.reduce(
        (sum, item) => sum + item.summary.blockingIssues,
        0,
      ),
      warnings: evaluations.reduce((sum, item) => sum + item.summary.warnings, 0),
    },
    evaluations,
  };
}

function renderMarkdown(report) {
  const rows = report.evaluations
    .map(
      (item) =>
        `| ${item.repositoryId} | ${item.tag} | ${item.status} | ${item.summary.blockingIssues} | ${item.summary.warnings} |`,
    )
    .join("\n");

  const issueList = report.evaluations
    .flatMap((item) =>
      item.issues.map(
        (issue) =>
          `- ${item.repositoryId} ${issue.pipelineId} ${issue.code}: ${issue.remediation}`,
      ),
    )
    .join("\n");

  return `# Repository Compute Sandbox Policy Guard

Synthetic reviewer packet for ${report.issue}.

## Summary

| Candidate | Tag | Status | Blocking issues | Warnings |
| --- | --- | --- | ---: | ---: |
${rows}

## Gate Totals

- Ready candidates: ${report.totals.ready}
- Needs review: ${report.totals.needsReview}
- Blocked candidates: ${report.totals.blocked}
- Blocking issues: ${report.totals.blockingIssues}
- Warnings: ${report.totals.warnings}

## Deterministic Remediation Queue

${issueList || "- No remediation required."}

## Requirement Mapping

- Pinned sandbox images: ${REQUIREMENT_MAP.pinned_image}
- Network egress policy: ${REQUIREMENT_MAP.network_policy}
- CPU, memory, runtime, and GPU budgets: ${REQUIREMENT_MAP.compute_budget}
- Limited writable mounts: ${REQUIREMENT_MAP.writable_mounts}
- Artifact hash checkpoints: ${REQUIREMENT_MAP.artifact_hashes}
- DOI and export blocking actions: ${REQUIREMENT_MAP.export_gate}
`;
}

function renderSvg(report) {
  const width = 960;
  const height = 540;
  const cardWidth = 280;
  const colors = {
    ready: "#157f57",
    needs_review: "#b7791f",
    blocked: "#b42318",
  };
  const cards = report.evaluations
    .map((item, index) => {
      const x = 40 + index * (cardWidth + 20);
      const color = colors[item.status];
      return `<g>
  <rect x="${x}" y="170" width="${cardWidth}" height="230" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <rect x="${x}" y="170" width="${cardWidth}" height="10" rx="8" fill="${color}"/>
  <text x="${x + 18}" y="215" fill="#111827" font-size="18" font-family="Arial, sans-serif">${escapeXml(item.repositoryId)}</text>
  <text x="${x + 18}" y="245" fill="#4b5563" font-size="14" font-family="Arial, sans-serif">${escapeXml(item.tag)}</text>
  <text x="${x + 18}" y="295" fill="${color}" font-size="30" font-family="Arial, sans-serif" font-weight="700">${escapeXml(item.status)}</text>
  <text x="${x + 18}" y="340" fill="#111827" font-size="16" font-family="Arial, sans-serif">Checks: ${item.summary.passedChecks}/${item.summary.checks}</text>
  <text x="${x + 18}" y="370" fill="#111827" font-size="16" font-family="Arial, sans-serif">Blocks: ${item.summary.blockingIssues}</text>
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Repository compute sandbox policy guard</title>
<desc id="desc">Deterministic status report for SCIBASE repository release candidates.</desc>
<rect width="${width}" height="${height}" fill="#f6f8fa"/>
<text x="40" y="70" fill="#111827" font-size="34" font-family="Arial, sans-serif" font-weight="700">Repository Compute Sandbox Policy Guard</text>
<text x="40" y="108" fill="#4b5563" font-size="18" font-family="Arial, sans-serif">Pinned containers, network policy, budgets, writable mounts, and artifact hashes.</text>
<g>
  <rect x="40" y="125" width="190" height="28" rx="6" fill="#e6f4ea"/>
  <text x="54" y="145" fill="#157f57" font-size="14" font-family="Arial, sans-serif">Ready ${report.totals.ready}</text>
  <rect x="250" y="125" width="190" height="28" rx="6" fill="#fff4d6"/>
  <text x="264" y="145" fill="#8a5a00" font-size="14" font-family="Arial, sans-serif">Needs review ${report.totals.needsReview}</text>
  <rect x="460" y="125" width="190" height="28" rx="6" fill="#ffebe9"/>
  <text x="474" y="145" fill="#b42318" font-size="14" font-family="Arial, sans-serif">Blocked ${report.totals.blocked}</text>
</g>
${cards}
<text x="40" y="470" fill="#4b5563" font-size="15" font-family="Arial, sans-serif">Issue mapping: Project Repository and Version Control, computation-aware reproducibility, execution sandboxes, export bundles.</text>
</svg>
`;
}

function checkPinnedImage(pipeline, sandbox, policy, addCheck, addIssue) {
  const image = sandbox.image || "";
  const pinned = image.includes("@sha256:") && !image.endsWith(":latest");
  addCheck(pipeline.id, "PINNED_SANDBOX_IMAGE", pinned, image || "missing image");

  if (!pinned) {
    addIssue(
      "error",
      pipeline.id,
      "SANDBOX_IMAGE_NOT_PINNED",
      "Sandbox image must be digest-pinned and must not use latest tags.",
      REQUIREMENT_MAP.pinned_image,
      "Pin the execution image with an immutable sha256 digest.",
    );
  }
}

function checkNetworkPolicy(pipeline, sandbox, policy, addCheck, addIssue) {
  const mode = sandbox.networkEgress || "unspecified";
  const allowedMode = policy.allowedEgressModes.includes(mode);
  const allowlist = [...(sandbox.egressAllowlist || [])].sort();
  const doiOnly =
    mode !== "doi-resolution-only" ||
    allowlist.every((host) => policy.doiResolverAllowlist.includes(host));
  const passed = allowedMode && doiOnly;
  addCheck(pipeline.id, "NETWORK_EGRESS_POLICY", passed, mode);

  if (!allowedMode || !doiOnly) {
    addIssue(
      "error",
      pipeline.id,
      "NETWORK_EGRESS_TOO_BROAD",
      "Reproducibility execution cannot use open or unreviewed network egress.",
      REQUIREMENT_MAP.network_policy,
      "Set egress to none, or restrict DOI lookup to the approved resolver allowlist.",
    );
  }
}

function checkComputeBudget(pipeline, compute, policy, addCheck, addIssue) {
  const cpuOk = numberAtMost(compute.cpuCores, policy.maxCpuCores);
  const memoryOk = numberAtMost(compute.memoryGb, policy.maxMemoryGb);
  const runtimeOk = numberAtMost(
    compute.runtimeMinutes,
    policy.maxRuntimeMinutes,
  );
  const seeded = Boolean(compute.deterministicSeed);

  addCheck(
    pipeline.id,
    "CPU_MEMORY_RUNTIME_BUDGET",
    cpuOk && memoryOk && runtimeOk,
    `cpu=${compute.cpuCores}; memoryGb=${compute.memoryGb}; runtimeMinutes=${compute.runtimeMinutes}`,
  );
  addCheck(pipeline.id, "DETERMINISTIC_SEED", seeded, compute.deterministicSeed);

  if (!cpuOk || !memoryOk || !runtimeOk) {
    addIssue(
      "error",
      pipeline.id,
      "COMPUTE_BUDGET_EXCEEDED",
      "The pipeline exceeds the approved CPU, memory, or runtime budget.",
      REQUIREMENT_MAP.compute_budget,
      `Keep CPU <= ${policy.maxCpuCores}, memory <= ${policy.maxMemoryGb} GB, and runtime <= ${policy.maxRuntimeMinutes} minutes.`,
    );
  }

  if (!seeded) {
    addIssue(
      "error",
      pipeline.id,
      "DETERMINISTIC_SEED_MISSING",
      "The pipeline does not declare a deterministic seed.",
      REQUIREMENT_MAP.compute_budget,
      "Declare the seed used for replay so results can be regenerated byte-for-byte.",
    );
  }

  if ((compute.gpuCount || 0) > 0) {
    const justified = Boolean(compute.gpuJustification) && seeded;
    addCheck(
      pipeline.id,
      "GPU_REVIEW_PACKET",
      justified,
      compute.gpuJustification || "missing GPU justification",
    );
    addIssue(
      justified ? "warning" : "error",
      pipeline.id,
      "GPU_REVIEW_REQUIRED",
      "GPU execution requires reviewer signoff because hardware kernels can affect determinism.",
      REQUIREMENT_MAP.compute_budget,
      "Attach deterministic kernel notes and reviewer signoff before final publication.",
    );
  }
}

function checkWritableMounts(pipeline, sandbox, policy, addCheck, addIssue) {
  const mounts = sandbox.writableMounts || [];
  const inputsReadOnly = sandbox.readOnlyInputs === true;
  addCheck(
    pipeline.id,
    "READ_ONLY_INPUTS",
    inputsReadOnly,
    inputsReadOnly ? "inputs are read-only" : "inputs may be mutable",
  );

  if (!inputsReadOnly) {
    addIssue(
      "error",
      pipeline.id,
      "INPUTS_NOT_READ_ONLY",
      "Repository inputs must be mounted read-only during replay.",
      REQUIREMENT_MAP.writable_mounts,
      "Mount repository inputs read-only and write outputs only to the controlled scratch path.",
    );
  }

  for (const mount of mounts) {
    const allowedPath = policy.permittedWritablePrefixes.some((prefix) =>
      String(mount.path || "").startsWith(prefix),
    );
    const sizeOk = numberAtMost(mount.maxGb, policy.maxWritableGb);
    addCheck(
      pipeline.id,
      `WRITABLE_MOUNT_${mount.path || "missing"}`,
      allowedPath && sizeOk,
      `path=${mount.path}; maxGb=${mount.maxGb}`,
    );

    if (!allowedPath || !sizeOk) {
      addIssue(
        "error",
        pipeline.id,
        "WRITABLE_MOUNT_NOT_CONSTRAINED",
        "Writable mount is outside the approved scratch prefix or exceeds size limits.",
        REQUIREMENT_MAP.writable_mounts,
        `Use ${policy.permittedWritablePrefixes.join(", ")} with max ${policy.maxWritableGb} GB.`,
      );
    }
  }
}

function checkPipelineHashes(pipeline, policy, addCheck, addIssue) {
  const hashFields = [
    ["INPUT_MANIFEST_HASH", pipeline.inputManifestHash],
    ["LOCKFILE_HASH", pipeline.lockfileHash],
  ];
  for (const [code, value] of hashFields) {
    const passed = isHash(value, policy);
    addCheck(pipeline.id, code, passed, value || "missing");
    if (!passed) {
      addIssue(
        "error",
        pipeline.id,
        `${code}_MISSING`,
        `${code} is missing a sha256 checkpoint.`,
        REQUIREMENT_MAP.artifact_hashes,
        `Generate ${code.toLowerCase()} before accepting this release candidate.`,
      );
    }
  }

  const artifacts = pipeline.expectedArtifacts || [];
  for (const artifact of artifacts) {
    const passed = isHash(artifact.hash, policy);
    addCheck(
      pipeline.id,
      `ARTIFACT_HASH_${artifact.name}`,
      passed,
      artifact.hash || "missing",
    );
    if (!passed) {
      addIssue(
        "error",
        pipeline.id,
        "EXPECTED_ARTIFACT_HASH_MISSING",
        `Expected artifact ${artifact.name} is missing a sha256 checkpoint.`,
        REQUIREMENT_MAP.artifact_hashes,
        "Run the pipeline once in the sandbox and record the artifact hash before export.",
      );
    }
  }
}

function buildReleaseActions(status, issues) {
  const blocking = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return {
    allowProtectedMerge: blocking.length === 0,
    allowExportBundle: blocking.length === 0,
    allowDoiPublication: blocking.length === 0 && warnings.length === 0,
    requiresReviewerSignoff: warnings.length > 0,
    remediationChecklist: issues.map((issue) => ({
      code: issue.code,
      pipelineId: issue.pipelineId,
      action: issue.remediation,
    })),
    status,
  };
}

function assertCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new TypeError("candidate must be an object");
  }
  for (const field of ["repositoryId", "tag", "pipelines"]) {
    if (!candidate[field]) {
      throw new TypeError(`candidate.${field} is required`);
    }
  }
  if (!Array.isArray(candidate.pipelines) || candidate.pipelines.length === 0) {
    throw new TypeError("candidate.pipelines must contain at least one pipeline");
  }
}

function numberAtMost(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value <= max;
}

function isHash(value, policy) {
  return (
    typeof value === "string" &&
    value.startsWith(policy.requiredHashPrefix) &&
    value.length >= policy.requiredHashPrefix.length + 16
  );
}

function compareIssues(a, b) {
  return (
    severityRank(a.severity) - severityRank(b.severity) ||
    a.pipelineId.localeCompare(b.pipelineId) ||
    a.code.localeCompare(b.code)
  );
}

function severityRank(severity) {
  return severity === "error" ? 0 : 1;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  DEFAULT_POLICY,
  REQUIREMENT_MAP,
  createPolicyReport,
  evaluateRepositoryComputePolicy,
  renderMarkdown,
  renderSvg,
};
