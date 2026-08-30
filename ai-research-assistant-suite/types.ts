// SPDX-License-Identifier: MIT
/**
 * TypeScript domain type definitions for the AI-Powered Research Assistant Suite.
 */

export type ScientificDomain = 
  | "MOLECULAR_BIOLOGY"
  | "QUANTUM_PHYSICS"
  | "CLINICAL_TRIALS"
  | "COMPUTER_SCIENCE"
  | "GENERAL_SCIENCE";

export type ReviewSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ReviewFlag {
  category: "CLARITY" | "METHODOLOGY" | "STATISTICAL" | "CITATION" | "CLAIM_EVIDENCE";
  severity: ReviewSeverity;
  message: string;
  location?: string;
  suggestion: string;
}

export interface PeerReviewReport {
  id: string;
  manuscriptTitle: string;
  domain: ScientificDomain;
  overallScore: number; // 0 - 100
  recommendation: "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
  flags: ReviewFlag[];
  strengths: string[];
  weaknesses: string[];
  domainSpecificChecks: Record<string, boolean | string>;
  generatedAt: string;
}

export interface DependencyCheck {
  package: string;
  requiredVersion: string;
  installedVersion?: string;
  status: "MATCH" | "MISMATCH" | "MISSING";
}

export interface ReproducibilityAttempt {
  attemptId: string;
  timestamp: string;
  environment: string;
  passed: boolean;
  divergenceMetric: number; // 0.0 - 1.0 (0.0 = perfect match)
  logs: string[];
}

export interface ReproducibilityReport {
  projectId: string;
  projectName: string;
  confidenceScore: number; // 0 - 100
  deterministicExecution: boolean;
  cleanPipelinesDetected: boolean;
  rawDataPresent: boolean;
  dependencies: DependencyCheck[];
  attempts: ReproducibilityAttempt[];
  status: "VERIFIED_REPRODUCIBLE" | "CONDITIONALLY_REPRODUCIBLE" | "FAILED";
  summary: string;
}

export interface ResearchGap {
  id: string;
  intersectionQuery: string; // e.g., "CRISPR + Alzheimer's + single-cell RNA-seq"
  domain: ScientificDomain;
  publicationCount: number;
  unresolvedQuestionsCount: number;
  replicationRatio: number;
  opportunityScore: number; // 0 - 100
  recommendedHypotheses: string[];
}

export interface ResearchOpportunityFeed {
  userId: string;
  generatedAt: string;
  topOpportunities: ResearchGap[];
  neglectedAreas: string[];
  suggestedCollaborations: string[];
}
