#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildAssistantBrief, buildEvidenceMap, generatePeerReviewReport, runReproducibilityCheck, findResearchGaps } from './index.js';

const fixturePath = process.argv[2] || path.join(import.meta.dirname, '..', 'sample', 'assistant-fixture.json');
const project = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const evidenceMap = buildEvidenceMap(project);
const peerReview = generatePeerReviewReport(project, evidenceMap);
const reproducibility = runReproducibilityCheck(project);
const gaps = findResearchGaps(project);
const brief = buildAssistantBrief(project);

console.log(JSON.stringify({
  projectId: brief.projectId,
  status: brief.status,
  evidenceCoverage: brief.evidenceCoverage,
  peerReviewRecommendation: brief.peerReviewRecommendation,
  reproducibilityConfidence: brief.reproducibilityConfidence,
  topResearchGap: brief.topResearchGap?.id,
  weakClaims: evidenceMap.weakClaims.map((claim) => claim.claimId),
  peerReviewFindings: peerReview.findings.length,
  gapCount: gaps.opportunities.length,
  auditHash: brief.auditHash
}, null, 2));
