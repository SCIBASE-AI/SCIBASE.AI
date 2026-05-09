import type { ReproducibilityCheck, ReproducibilityReport, ResearchProject } from "../types.js"

function check(id: string, label: string, passed: boolean, evidence: string): ReproducibilityCheck {
  return {
    id,
    label,
    status: passed ? "passed" : "failed",
    evidence
  }
}

export function runReproducibilityChecks(project: ResearchProject): ReproducibilityReport {
  const artifacts = project.artifacts
  const hasNotebook = artifacts.some((artifact) => artifact.type === "notebook")
  const environment = artifacts.find((artifact) => artifact.type === "environment")
  const dataset = artifacts.find((artifact) => artifact.type === "dataset")
  const pipeline = artifacts.find((artifact) => artifact.type === "pipeline" || artifact.type === "script")
  const testSet = artifacts.find((artifact) => artifact.type === "test_set")
  const results = artifacts.find((artifact) => artifact.type === "results")
  const runnableArtifact = artifacts.find((artifact) => artifact.content.toLowerCase().includes("run:"))
  const seeded = artifacts.some((artifact) => artifact.content.toLowerCase().includes("seed"))
  const environmentContent = environment?.content ?? ""
  const dependencyIntegrity = Boolean(environmentContent) &&
    /\d+\.\d+/.test(environmentContent) &&
    !environmentContent.toLowerCase().includes("latest")
  const outputConsistency = Boolean(results) && seeded

  const checks: ReproducibilityCheck[] = [
    check("notebook_present", "Notebook or executable analysis is present", hasNotebook, hasNotebook ? "Notebook artifact found." : "No notebook artifact found."),
    check("environment_present", "Execution environment is specified", Boolean(environment), environment?.path ?? "Missing Dockerfile/environment file."),
    check("dependency_integrity", "Dependency versions are pinned for sandbox execution", dependencyIntegrity, environment?.content ?? "No pinned dependency manifest found."),
    check("dataset_manifest", "Raw data or dataset manifest is available", Boolean(dataset), dataset?.path ?? "No dataset manifest found."),
    check("pipeline_present", "Clean pipeline artifact is available", Boolean(pipeline), pipeline?.path ?? "No analysis pipeline/script artifact found."),
    check("test_set_present", "Test set or validation split is available", Boolean(testSet), testSet?.path ?? "No test-set artifact found."),
    check("reproduction_command", "Reproduction command is documented", Boolean(runnableArtifact), runnableArtifact?.content ?? "No run command found."),
    check("deterministic_seed", "Deterministic seed is documented", seeded, seeded ? "Seed keyword found." : "No deterministic seed found."),
    check("output_consistency", "Reported output can be compared against expected results", outputConsistency, results?.content ?? "No expected result artifact found.")
  ]

  const passed = checks.filter((item) => item.status === "passed").length
  const confidenceScore = Math.round((passed / checks.length) * 100)
  const status = confidenceScore >= 80 ? "passed" : confidenceScore >= 50 ? "blocked" : "failed"

  return {
    projectId: project.id,
    confidenceScore,
    status,
    checks,
    recommendedCommand: runnableArtifact?.content.replace(/^run:\s*/i, ""),
    sandbox: {
      runner: "local-sandbox-simulator",
      command: runnableArtifact?.content.replace(/^run:\s*/i, ""),
      dependencyFingerprint: environment?.content.split("\n").sort().join("|"),
      outputConsistency: outputConsistency ? "consistent" : results ? "mismatch" : "not_checked"
    },
    previousAttempts: project.previousReproducibilityAttempts ?? []
  }
}
