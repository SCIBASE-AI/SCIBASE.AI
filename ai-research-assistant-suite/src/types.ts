export type ResearchDomain = "biology" | "physics" | "clinical" | "climate" | "machine_learning"

export type ReviewSeverity = "info" | "warning" | "critical"

export type ExecutionStatus = "passed" | "failed" | "blocked"

export interface ManuscriptSection {
  id: string
  heading: string
  text: string
}

export interface ProjectArtifact {
  id: string
  type: "manuscript" | "notebook" | "dataset" | "script" | "environment" | "pipeline" | "test_set" | "results"
  path: string
  content: string
}

export interface ReproducibilityAttempt {
  attemptId: string
  executedAt: string
  runner: string
  status: ExecutionStatus
  confidenceScore: number
  notes: string
}

export interface ResearchProject {
  id: string
  title: string
  domain: ResearchDomain
  keywords: string[]
  sections: ManuscriptSection[]
  artifacts: ProjectArtifact[]
  previousReproducibilityAttempts?: ReproducibilityAttempt[]
}

export interface ReviewFinding {
  id: string
  severity: ReviewSeverity
  category: "clarity" | "statistics" | "ethics" | "data_availability" | "citation" | "claims"
  message: string
  evidence: string
  recommendation: string
}

export interface PeerReviewReport {
  projectId: string
  domain: ResearchDomain
  generatedAt: string
  summary: string
  score: number
  findings: ReviewFinding[]
  template: string[]
  modelProfile: {
    name: string
    trainedOn: string[]
    calibration: string
  }
  coveredSignals: string[]
}

export interface ReproducibilityCheck {
  id: string
  label: string
  status: ExecutionStatus
  evidence: string
}

export interface ReproducibilityReport {
  projectId: string
  confidenceScore: number
  status: ExecutionStatus
  checks: ReproducibilityCheck[]
  recommendedCommand?: string
  sandbox: {
    runner: string
    command?: string
    dependencyFingerprint?: string
    outputConsistency: "consistent" | "not_checked" | "mismatch"
  }
  previousAttempts: ReproducibilityAttempt[]
}

export interface CorpusPaper {
  id: string
  title: string
  domain: ResearchDomain
  keywords: string[]
  citationCount: number
  replicationCount: number
  unresolvedQuestions: string[]
  limitations: string[]
  negativeFindings: string[]
  publishedAt: string
}

export interface ResearchGap {
  id: string
  title: string
  rationale: string
  signal: "under_studied_intersection" | "unresolved_question" | "low_replication_cluster" | "negative_result_follow_up"
  keywords: string[]
  noveltyScore: number
  evidencePaperIds: string[]
}
