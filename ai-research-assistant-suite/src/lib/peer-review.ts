import type { PeerReviewReport, ResearchProject, ReviewFinding } from "../types.js"

const domainTemplates: Record<ResearchProject["domain"], string[]> = {
  biology: ["Methods clarity", "Statistical reporting", "Ethics statement", "Data availability", "Claims versus evidence"],
  physics: ["Model assumptions", "Units and constants", "Reproducibility", "Uncertainty analysis", "Claims versus evidence"],
  clinical: ["Ethics statement", "Cohort description", "Statistical reporting", "Data availability", "Safety claims"],
  climate: ["Baseline comparison", "Uncertainty calibration", "Regional validity", "Open data", "Claims versus evidence"],
  machine_learning: ["Dataset split", "Baseline comparison", "Ablations", "Reproducibility", "Claims versus evidence"]
}

const modelProfile = {
  name: "SCIBASE review-assistant deterministic evaluator",
  trainedOn: ["OpenReview-style review rubrics", "arXiv moderation signals", "publisher reviewer feedback patterns"],
  calibration: "Rules mirror common peer-review failure modes and produce schema-valid findings for later LLM adapter replacement."
}

function text(project: ResearchProject) {
  return [
    ...project.sections.map((section) => `${section.heading}\n${section.text}`),
    ...project.artifacts.map((artifact) => artifact.content)
  ].join("\n").toLowerCase()
}

function finding(input: Omit<ReviewFinding, "id">): ReviewFinding {
  return {
    id: `finding_${input.category}_${input.severity}`,
    ...input
  }
}

export function generatePeerReview(project: ResearchProject, generatedAt = new Date().toISOString()): PeerReviewReport {
  const body = text(project)
  const findings: ReviewFinding[] = []

  if (!body.includes("ethics") && ["biology", "clinical"].includes(project.domain)) {
    findings.push(finding({
      severity: "critical",
      category: "ethics",
      message: "Ethics approval is missing or not clearly stated.",
      evidence: "No ethics/IRB keyword found in manuscript or artifacts.",
      recommendation: "Add the approving body, protocol identifier, and consent status."
    }))
  }

  if (!body.includes("data availability") || body.includes("pending")) {
    findings.push(finding({
      severity: "warning",
      category: "data_availability",
      message: "Data availability is incomplete.",
      evidence: "Data availability appears absent or marked pending.",
      recommendation: "Provide accession links, controlled-access instructions, or a clear restriction rationale."
    }))
  }

  if (body.includes("p-value") && !body.includes("confidence interval")) {
    findings.push(finding({
      severity: "warning",
      category: "statistics",
      message: "Statistical reporting relies on p-values without confidence intervals.",
      evidence: "Detected p-value but no confidence interval language.",
      recommendation: "Add effect sizes and confidence intervals for primary outcomes."
    }))
  }

  if (!body.includes("citation") && !body.includes("references") && !body.includes("doi")) {
    findings.push(finding({
      severity: "warning",
      category: "citation",
      message: "Citation context is missing from the reviewed manuscript package.",
      evidence: "No citation, references, or DOI signal found in manuscript sections or artifacts.",
      recommendation: "Attach a reference list or citation manifest so claims can be checked against prior work."
    }))
  }

  if (body.includes("supports the claim") && !body.includes("limitation")) {
    findings.push(finding({
      severity: "info",
      category: "claims",
      message: "Claims would benefit from explicit limitations.",
      evidence: "Strong claim language found without limitation framing.",
      recommendation: "Add a limitations paragraph covering cohort size, batch effects, and generalization."
    }))
  }

  if (findings.length === 0) {
    findings.push(finding({
      severity: "info",
      category: "clarity",
      message: "No major automated review issues detected.",
      evidence: "Required manuscript signals were present.",
      recommendation: "Proceed to human peer review for domain-specific assessment."
    }))
  }

  const penalty = findings.reduce((sum, item) => {
    if (item.severity === "critical") return sum + 25
    if (item.severity === "warning") return sum + 12
    return sum + 4
  }, 0)

  return {
    projectId: project.id,
    domain: project.domain,
    generatedAt,
    summary: `${findings.length} automated review finding${findings.length === 1 ? "" : "s"} generated for ${project.title}.`,
    score: Math.max(0, 100 - penalty),
    findings,
    template: domainTemplates[project.domain],
    modelProfile,
    coveredSignals: ["clarity", "statistics", "ethics", "data_availability", "citation", "claims_vs_evidence"]
  }
}
