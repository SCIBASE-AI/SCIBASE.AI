const DECISIONS = Object.freeze({
  RELEASE: "RELEASE_ASSISTANT_OUTPUT",
  REVISE: "REVISE_ASSISTANT_OUTPUT",
  HOLD: "HOLD_ASSISTANT_OUTPUT"
});

const SEVERITY_RANK = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
});

const DEFAULTS = Object.freeze({
  datasetMultiplier: 2.5,
  minimumRamHeadroomGb: 4,
  runtimeBudgetHours: 8,
  expensiveCloudThresholdUsd: 25,
  longRunHours: 6,
  largeDatasetGb: 100
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function createFinding(code, severity, title, evidence, remediation) {
  return { code, severity, title, evidence, remediation };
}

function datasetWorkingSetGb(packet) {
  const dataset = packet.dataset || {};
  const sizeGb = toNumber(dataset.sizeGb);
  const multiplier = toNumber(dataset.workingSetMultiplier, DEFAULTS.datasetMultiplier);
  return Number((sizeGb * multiplier).toFixed(2));
}

function computeRamGb(packet) {
  const compute = packet.compute || {};
  const ramGb = toNumber(compute.ramGb);
  const gpuVramGb = toNumber(compute.gpuVramGb);
  const gpuCount = toNumber(compute.gpuCount);
  return {
    ramGb,
    totalGpuVramGb: Number((gpuVramGb * Math.max(1, gpuCount || 0)).toFixed(2))
  };
}

function hasHardwareSpec(packet) {
  const compute = packet.compute || {};
  return Boolean(
    compute.cpuCores &&
      compute.ramGb &&
      (compute.accelerator === "none" || compute.gpuVramGb || compute.accelerator === "cpu")
  );
}

function hasContainerEvidence(packet) {
  const environment = packet.environment || {};
  return Boolean(
    environment.containerDigest ||
      environment.lockfileDigest ||
      environment.runtimeDigest ||
      environment.notebookEnvironmentDigest
  );
}

function hasDeterminismEvidence(packet) {
  const reproducibility = packet.reproducibility || {};
  const controls = asArray(reproducibility.determinismControls);
  return Boolean(reproducibility.seedPolicy && controls.length > 0);
}

function resourceDisclosure(packet) {
  const disclosure = packet.disclosure || {};
  return {
    hasCost: disclosure.estimatedCostUsd !== undefined,
    costUsd: toNumber(disclosure.estimatedCostUsd),
    hasQueue: Boolean(disclosure.queuePolicy || disclosure.hpcQueuePolicy),
    hasCarbon: Boolean(disclosure.carbonOrResourceNote)
  };
}

function evaluateMemory(packet) {
  const dataset = packet.dataset || {};
  const compute = computeRamGb(packet);
  const findings = [];
  const workingSetGb = datasetWorkingSetGb(packet);
  const ramCapacity = compute.ramGb - DEFAULTS.minimumRamHeadroomGb;

  if (toNumber(dataset.sizeGb) === 0) {
    return findings;
  }

  if (compute.ramGb && workingSetGb > ramCapacity) {
    findings.push(
      createFinding(
        "DATASET_MEMORY_EXCEEDS_NODE",
        "critical",
        "Dataset working set exceeds stated system memory",
        `${workingSetGb} GB estimated working set vs ${compute.ramGb} GB RAM with ${DEFAULTS.minimumRamHeadroomGb} GB reserved headroom.`,
        "Provide a smaller reviewer fixture, streaming pipeline proof, shard plan, or larger reproducible hardware profile."
      )
    );
  }

  if (dataset.requiresGpuResidency && compute.totalGpuVramGb && workingSetGb > compute.totalGpuVramGb) {
    findings.push(
      createFinding(
        "GPU_VRAM_FEASIBILITY_GAP",
        "high",
        "GPU-resident workload exceeds available VRAM",
        `${workingSetGb} GB working set marked GPU-resident vs ${compute.totalGpuVramGb} GB total VRAM.`,
        "Document gradient accumulation, checkpointing, offload, or a verified smaller fixture before release."
      )
    );
  }

  return findings;
}

function evaluateRuntime(packet) {
  const compute = packet.compute || {};
  const findings = [];
  const runtimeHours = toNumber(compute.estimatedRuntimeHours);
  const budgetHours = toNumber(compute.reviewerBudgetHours, DEFAULTS.runtimeBudgetHours);

  if (runtimeHours > budgetHours) {
    findings.push(
      createFinding(
        "RUNTIME_BUDGET_UNREALISTIC",
        runtimeHours > budgetHours * 2 ? "high" : "medium",
        "Reviewer rerun time exceeds the stated review budget",
        `${runtimeHours} hour rerun estimate vs ${budgetHours} hour reviewer budget.`,
        "Split the rerun into smoke, fixture, and full modes or disclose that full reproduction requires extended resources."
      )
    );
  }

  if (runtimeHours >= DEFAULTS.longRunHours && !packet.reproducibility?.checkpointResumeEvidence) {
    findings.push(
      createFinding(
        "CHECKPOINT_RESUME_MISSING",
        "high",
        "Long rerun lacks checkpoint or resume evidence",
        `${runtimeHours} hour run has no checkpoint/resume evidence in the packet.`,
        "Attach a checkpoint manifest, restart transcript, or resumable workflow proof."
      )
    );
  }

  return findings;
}

function evaluateEnvironment(packet) {
  const findings = [];

  if (!hasHardwareSpec(packet)) {
    findings.push(
      createFinding(
        "HARDWARE_SPEC_MISSING",
        "high",
        "Hardware profile is incomplete",
        "The packet does not state enough CPU, RAM, accelerator, and VRAM information for reviewer rerun planning.",
        "Publish a reviewer hardware profile with minimum and validated configurations."
      )
    );
  }

  if (!hasContainerEvidence(packet)) {
    findings.push(
      createFinding(
        "CONTAINER_OR_LOCKFILE_MISSING",
        "high",
        "Executable environment evidence is missing",
        "No container digest, lockfile digest, runtime digest, or notebook environment digest was provided.",
        "Attach a digest-pinned container, lockfile, runtime manifest, or archived notebook environment."
      )
    );
  }

  return findings;
}

function evaluateDeterminism(packet) {
  const findings = [];
  const compute = packet.compute || {};
  const reproducibility = packet.reproducibility || {};

  if (compute.accelerator && compute.accelerator !== "none" && compute.accelerator !== "cpu") {
    const controls = asArray(reproducibility.determinismControls).join(" ").toLowerCase();
    const mentionsNondeterminism = controls.includes("deterministic") || controls.includes("cudnn") || controls.includes("seed");
    if (!mentionsNondeterminism || !reproducibility.seedPolicy) {
      findings.push(
        createFinding(
          "NONDETERMINISTIC_ACCELERATOR_PATH",
          "high",
          "Accelerator rerun lacks determinism controls",
          `${compute.accelerator} path is present without seed policy plus deterministic kernel/runtime controls.`,
          "Document seed handling, deterministic kernel settings, tolerance windows, and accepted variance."
        )
      );
    }
  }

  if (!hasDeterminismEvidence(packet)) {
    findings.push(
      createFinding(
        "SEED_POLICY_MISSING",
        "medium",
        "Seed or variance policy is missing",
        "The assistant packet has no seed policy and no deterministic control list.",
        "Add seed policy, variance acceptance bands, and a rerun transcript showing stable outputs."
      )
    );
  }

  return findings;
}

function evaluateAccessAndDisclosure(packet) {
  const findings = [];
  const dataset = packet.dataset || {};
  const compute = packet.compute || {};
  const disclosure = resourceDisclosure(packet);
  const downloadGb = toNumber(dataset.downloadGb, dataset.sizeGb);

  if (downloadGb >= DEFAULTS.largeDatasetGb && !dataset.syntheticFixtureAvailable) {
    findings.push(
      createFinding(
        "DATA_ACCESS_BANDWIDTH_GAP",
        "medium",
        "Large data transfer lacks a reviewer fixture",
        `${downloadGb} GB download is required and no synthetic or reduced reviewer fixture is listed.`,
        "Provide a small fixture, cached digest, or staged data-access plan with expected transfer time."
      )
    );
  }

  if ((compute.paidCloudRequired || compute.hpcQueueRequired) && (!disclosure.hasCost || disclosure.costUsd === 0)) {
    findings.push(
      createFinding(
        "CLOUD_OR_HPC_COST_UNDISCLOSED",
        "high",
        "Paid cloud or queued HPC requirement is not disclosed",
        "The packet requires paid cloud/HPC resources but does not disclose expected reviewer cost.",
        "State cost, queue assumptions, no-cost fixture alternative, and who bears the rerun cost."
      )
    );
  }

  if (disclosure.costUsd > DEFAULTS.expensiveCloudThresholdUsd && !packet.dataset?.syntheticFixtureAvailable) {
    findings.push(
      createFinding(
        "NO_LOW_COST_REVIEWER_MODE",
        "high",
        "Expensive rerun lacks a low-cost review mode",
        `$${disclosure.costUsd.toFixed(2)} estimated cost without a synthetic fixture or low-cost mode.`,
        "Add an inexpensive smoke test and fixture-mode result before the AI assistant marks it reproducible."
      )
    );
  }

  if (toNumber(packet.compute?.estimatedRuntimeHours) >= DEFAULTS.longRunHours && !disclosure.hasCarbon) {
    findings.push(
      createFinding(
        "RESOURCE_IMPACT_NOTE_MISSING",
        "low",
        "Long compute rerun lacks resource-impact disclosure",
        "No carbon/resource note is attached for a long-running rerun.",
        "Add a short resource-impact note and reviewer-facing rerun alternatives."
      )
    );
  }

  return findings;
}

function decisionForFindings(findings) {
  const worst = findings.reduce((max, finding) => Math.max(max, SEVERITY_RANK[finding.severity] || 0), 0);
  const highOrWorse = findings.filter((finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.high).length;

  if (worst >= SEVERITY_RANK.critical || highOrWorse >= 3) {
    return DECISIONS.HOLD;
  }

  if (worst >= SEVERITY_RANK.medium || findings.length > 0) {
    return DECISIONS.REVISE;
  }

  return DECISIONS.RELEASE;
}

function scoreForFindings(findings) {
  const penalty = findings.reduce((total, finding) => total + (SEVERITY_RANK[finding.severity] || 0) * 10, 0);
  return Math.max(0, 100 - penalty);
}

function summarizeReadiness(packet, findings) {
  const workingSetGb = datasetWorkingSetGb(packet);
  const compute = computeRamGb(packet);
  return {
    packetId: packet.id,
    title: packet.title,
    assistantOutput: packet.assistantOutput || "reproducibility-checker",
    estimatedWorkingSetGb: workingSetGb,
    ramGb: compute.ramGb,
    totalGpuVramGb: compute.totalGpuVramGb,
    findingCount: findings.length,
    worstSeverity:
      findings
        .map((finding) => finding.severity)
        .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0] || "none"
  };
}

export function analyzeRerunPacket(packet) {
  const findings = [
    ...evaluateEnvironment(packet),
    ...evaluateMemory(packet),
    ...evaluateRuntime(packet),
    ...evaluateDeterminism(packet),
    ...evaluateAccessAndDisclosure(packet)
  ];

  const decision = decisionForFindings(findings);
  const score = scoreForFindings(findings);

  return {
    id: packet.id,
    title: packet.title,
    decision,
    score,
    summary: summarizeReadiness(packet, findings),
    findings,
    releaseGate: {
      canReleaseAssistantOutput: decision === DECISIONS.RELEASE,
      reviewerMessage:
        decision === DECISIONS.RELEASE
          ? "Compute evidence is sufficient for the assistant to present the rerun as reviewer-feasible."
          : "Hold or revise the assistant's reproducibility wording until compute feasibility evidence is repaired."
    }
  };
}

export function analyzeRerunPackets(packets) {
  const results = asArray(packets).map(analyzeRerunPacket);
  const decisionCounts = results.reduce((counts, result) => {
    counts[result.decision] = (counts[result.decision] || 0) + 1;
    return counts;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    packetCount: results.length,
    decisionCounts,
    results
  };
}

export { DECISIONS };
