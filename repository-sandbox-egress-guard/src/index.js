"use strict";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePlan(plan) {
  return {
    id: plan.id,
    title: plan.title || "Untitled repository sandbox plan",
    repository: plan.repository || {},
    execution: plan.execution || {},
    container: plan.container || {},
    network: plan.network || {},
    secrets: plan.secrets || {},
    resources: plan.resources || {},
    outputs: plan.outputs || {}
  };
}

function hasPinnedImage(plan) {
  return /^sha256:[a-f0-9]{64}$/i.test(String(plan.container.digest || ""));
}

function hasLockedExecution(plan) {
  return plan.execution.commandHashPresent === true && plan.execution.lockfilePresent === true;
}

function networkFinding(plan) {
  const mode = normalizeText(plan.network.mode);
  const allowedHosts = list(plan.network.allowedHosts).map(normalizeText).filter(Boolean);

  if (mode === "deny") return null;
  if (mode === "allowlist" && allowedHosts.length > 0 && !allowedHosts.includes("*")) {
    return finding(
      "SANDBOX_NETWORK_ALLOWLIST_REVIEW",
      "major",
      "The reproducibility run uses limited network egress and needs reviewer approval before merge.",
      { mode, allowedHosts },
      "Confirm every allowed host is required for deterministic package retrieval, then mirror or pin where possible."
    );
  }

  return finding(
    "SANDBOX_NETWORK_EGRESS_OPEN",
    "critical",
    "The reproducibility run allows open or wildcard network egress.",
    { mode: mode || "unspecified", allowedHosts },
    "Deny egress by default or replace it with a narrow host allowlist and cached inputs."
  );
}

function secretFindings(plan) {
  const env = list(plan.secrets.env).filter(Boolean);
  const mounts = list(plan.secrets.mounts).filter(Boolean);
  const findings = [];

  if (env.length > 0) {
    findings.push(finding(
      "SECRET_ENVIRONMENT_EXPOSED",
      "critical",
      "Secret-like environment variables are available to the repository execution sandbox.",
      { env },
      "Remove secrets from reproducibility runs and replace live credentials with synthetic or read-only fixtures."
    ));
  }

  if (mounts.length > 0) {
    findings.push(finding(
      "SECRET_MOUNT_EXPOSED",
      "critical",
      "Host secret paths are mounted into the repository execution sandbox.",
      { mounts },
      "Remove host secret mounts and use declared, non-sensitive repository fixtures."
    ));
  }

  return findings;
}

function unsafeMounts(plan) {
  return list(plan.container.mounts).filter((mount) => {
    const source = normalizeText(mount.source);
    const target = normalizeText(mount.target);
    return source.includes("docker.sock") ||
      target.includes("docker.sock") ||
      source.startsWith("/") && !source.startsWith("/workspace") ||
      normalizeText(mount.mode) === "rw" && target !== "/workspace/results" && target !== "/workspace/artifacts";
  });
}

function missingResourceCaps(plan) {
  const resources = plan.resources;
  return ["cpu", "memoryMb", "timeoutSeconds", "artifactLimitMb"].filter((key) => {
    const value = resources[key];
    if (typeof value === "string") return value.trim() === "";
    return !Number.isFinite(Number(value)) || Number(value) <= 0;
  });
}

function unsafeOutputPaths(plan) {
  return list(plan.outputs.paths).filter((rawPath) => {
    const value = String(rawPath || "").replace(/\\/g, "/");
    return value.startsWith("/") ||
      value.includes("../") ||
      !(value.startsWith("results/") || value.startsWith("artifacts/"));
  });
}

function analyzePlan(input) {
  const plan = normalizePlan(input);
  const findings = [];
  const network = networkFinding(plan);
  const mounts = unsafeMounts(plan);
  const missingCaps = missingResourceCaps(plan);
  const outputs = unsafeOutputPaths(plan);

  if (!hasPinnedImage(plan)) {
    findings.push(finding(
      "CONTAINER_IMAGE_NOT_PINNED",
      "major",
      "The execution container is not pinned by a content digest.",
      { image: plan.container.image || null, digest: plan.container.digest || null },
      "Pin the runner image with a sha256 digest before publishing or merging the reproducibility run."
    ));
  }

  if (!hasLockedExecution(plan)) {
    findings.push(finding(
      "EXECUTION_PROVENANCE_INCOMPLETE",
      "major",
      "The command hash or dependency lockfile evidence is missing.",
      {
        commandHashPresent: plan.execution.commandHashPresent || false,
        lockfilePresent: plan.execution.lockfilePresent || false
      },
      "Attach hashed commands and dependency lock evidence for the exact pipeline revision."
    ));
  }

  if (network) findings.push(network);
  findings.push(...secretFindings(plan));

  if (plan.container.privileged === true || normalizeText(plan.container.user) === "root" || plan.container.hostPid === true || plan.container.hostIpc === true) {
    findings.push(finding(
      "PRIVILEGED_SANDBOX_RUNTIME",
      "critical",
      "The sandbox uses privileged, root, host PID, or host IPC execution settings.",
      {
        privileged: plan.container.privileged || false,
        user: plan.container.user || null,
        hostPid: plan.container.hostPid || false,
        hostIpc: plan.container.hostIpc || false
      },
      "Run the container as a non-root user without privileged mode or host namespace sharing."
    ));
  }

  if (mounts.length > 0) {
    findings.push(finding(
      "UNSAFE_HOST_OR_WRITE_MOUNT",
      "critical",
      "The sandbox has unsafe host mounts or writable paths outside declared artifact locations.",
      { mounts },
      "Restrict mounts to read-only workspace inputs and writable results/artifacts directories."
    ));
  }

  if (missingCaps.length > 0) {
    findings.push(finding(
      "RESOURCE_CAPS_MISSING",
      "major",
      "The execution plan lacks one or more resource caps.",
      { missingCaps },
      "Set CPU, memory, timeout, and artifact-size caps before queueing the run."
    ));
  }

  if (outputs.length > 0) {
    findings.push(finding(
      "OUTPUT_PATH_ESCAPES_WORKSPACE",
      "critical",
      "One or more output paths escape declared results or artifacts directories.",
      { outputs },
      "Write outputs only under repository-scoped results/ or artifacts/ paths."
    ));
  }

  if (
    findings.length > 0 &&
    (plan.repository.publicReleaseEnabled === true || plan.repository.protectedBranchMerge === true) &&
    plan.repository.freezeRelease !== true
  ) {
    findings.push(finding(
      "REPOSITORY_RELEASE_NOT_FROZEN_FOR_SANDBOX_RISK",
      "critical",
      "Repository merge or public release remains enabled while sandbox findings are unresolved.",
      {
        publicReleaseEnabled: plan.repository.publicReleaseEnabled || false,
        protectedBranchMerge: plan.repository.protectedBranchMerge || false,
        freezeRelease: plan.repository.freezeRelease || false
      },
      "Freeze protected-branch merge, DOI tagging, and public reproducibility badges until sandbox findings are cleared."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: plan.id,
    title: plan.title,
    decision,
    pipeline: plan.execution.pipeline || null,
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD_MERGE";
  if (findings.some((item) => item.severity === "major")) return "REVIEW_MERGE";
  return "RELEASE";
}

function buildRecommendedActions(decision, findings) {
  if (decision === "RELEASE") {
    return ["Allow repository execution, merge, and tagged release with normal provenance."];
  }

  const actions = [
    "Attach sandbox findings to the repository review packet.",
    "Re-run the exact reproducibility pipeline after remediation.",
    "Preserve reviewer evidence with the tagged release record."
  ];

  if (findings.some((item) => item.code === "REPOSITORY_RELEASE_NOT_FROZEN_FOR_SANDBOX_RISK")) {
    actions.unshift("Freeze protected-branch merge, DOI tagging, and public reproducibility badges.");
  }

  return actions;
}

function analyzeSandboxRunPlans(plans) {
  const results = list(plans).map(analyzePlan);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { RELEASE: 0, REVIEW_MERGE: 0, HOLD_MERGE: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPlans: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePlan,
  analyzeSandboxRunPlans,
  hasPinnedImage,
  hasLockedExecution,
  unsafeMounts,
  unsafeOutputPaths,
  missingResourceCaps
};
