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
  const runnableArtifact = artifacts.find((artifact) => artifact.content.toLowerCase().includes("run:"))
  const seeded = artifacts.some((artifact) => artifact.content.toLowerCase().includes("seed"))

  const checks: ReproducibilityCheck[] = [
    check("notebook_present", "Notebook or executable analysis is present", hasNotebook, hasNotebook ? "Notebook artifact found." : "No notebook artifact found."),
    check("environment_present", "Execution environment is specified", Boolean(environment), environment?.path ?? "Missing Dockerfile/environment file."),
    check("dataset_manifest", "Dataset manifest is available", Boolean(dataset), dataset?.path ?? "No dataset manifest found."),
    check("reproduction_command", "Reproduction command is documented", Boolean(runnableArtifact), runnableArtifact?.content ?? "No run command found."),
    check("deterministic_seed", "Deterministic seed is documented", seeded, seeded ? "Seed keyword found." : "No deterministic seed found.")
  ]

  const passed = checks.filter((item) => item.status === "passed").length
  const confidenceScore = Math.round((passed / checks.length) * 100)
  const status = confidenceScore >= 80 ? "passed" : confidenceScore >= 50 ? "blocked" : "failed"

  return {
    projectId: project.id,
    confidenceScore,
    status,
    checks,
    recommendedCommand: runnableArtifact?.content.replace(/^run:\s*/i, "")
  }
}
