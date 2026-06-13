const fs = require('fs');
const path = require('path');
const { evaluateRecertification, buildSampleProject } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const project = buildSampleProject();
const result = evaluateRecertification(project);
const emptyEvidenceProject = {
  projectId: 'project-empty-reputation-evidence',
  asOf: '2026-05-30T12:00:00Z',
  artifacts: []
};
const emptyEvidenceResult = evaluateRecertification(emptyEvidenceProject);
const invalidReputationDeltaProject = buildInvalidReputationDeltaProject();
const invalidReputationDeltaResult = evaluateRecertification(invalidReputationDeltaProject);
const malformedEvidenceProject = buildMalformedEvidenceProject();
const malformedEvidenceResult = evaluateRecertification(malformedEvidenceProject);
const malformedCollectionProject = buildMalformedCollectionProject();
const malformedCollectionResult = evaluateRecertification(malformedCollectionProject);
const backdatedRecertificationProject = buildBackdatedRecertificationProject();
const backdatedRecertificationResult = evaluateRecertification(backdatedRecertificationProject);
const malformedProjectResult = evaluateRecertification(null);
const invalidProjectTimestampProject = buildInvalidProjectTimestampProject();
const invalidProjectTimestampResult = evaluateRecertification(invalidProjectTimestampProject);

const packetPath = path.join(reportsDir, 'recertification-packet.json');
const emptyPacketPath = path.join(reportsDir, 'empty-evidence-packet.json');
const invalidDeltaPacketPath = path.join(reportsDir, 'invalid-reputation-delta-packet.json');
const malformedEvidencePacketPath = path.join(reportsDir, 'malformed-evidence-packet.json');
const malformedCollectionPacketPath = path.join(reportsDir, 'malformed-collection-packet.json');
const backdatedRecertificationPacketPath = path.join(reportsDir, 'backdated-recertification-packet.json');
const malformedProjectPacketPath = path.join(reportsDir, 'malformed-project-packet.json');
const invalidProjectTimestampPacketPath = path.join(reportsDir, 'invalid-project-timestamp-packet.json');
const reportPath = path.join(reportsDir, 'recertification-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(emptyPacketPath, `${JSON.stringify(emptyEvidenceResult, null, 2)}\n`);
fs.writeFileSync(invalidDeltaPacketPath, `${JSON.stringify(invalidReputationDeltaResult, null, 2)}\n`);
fs.writeFileSync(malformedEvidencePacketPath, `${JSON.stringify(malformedEvidenceResult, null, 2)}\n`);
fs.writeFileSync(malformedCollectionPacketPath, `${JSON.stringify(malformedCollectionResult, null, 2)}\n`);
fs.writeFileSync(backdatedRecertificationPacketPath, `${JSON.stringify(backdatedRecertificationResult, null, 2)}\n`);
fs.writeFileSync(malformedProjectPacketPath, `${JSON.stringify(malformedProjectResult, null, 2)}\n`);
fs.writeFileSync(invalidProjectTimestampPacketPath, `${JSON.stringify(invalidProjectTimestampResult, null, 2)}\n`);

const staleReviewList = result.reviewDecisions
  .filter((decision) => decision.status !== 'current')
  .map((decision) => `- ${decision.id}: ${decision.reasons.join(', ')}`)
  .join('\n');

const taskList = result.recertificationTasks
  .map((task) => `- ${task.id} (${task.kind}, ${task.priority}): ${task.requiredAction}`)
  .join('\n');

const markdown = `# Peer Review Evidence Recertification Guard

Project: ${result.projectId}
Generated: ${result.generatedAt}

## Summary

- Total reviews evaluated: ${result.summary.totalReviews}
- Stale reviews requiring recertification: ${result.summary.staleReviews}
- Stale inline comments requiring anchor review: ${result.summary.staleComments}
- Frozen reputation delta: ${result.summary.frozenReputationDelta}
- Recommended action: ${result.summary.recommendedAction}
- Timeline audit digest: ${result.timelinePacket.auditDigest}

## Stale Review Evidence

${staleReviewList}

## Recertification Tasks

${taskList}

## Sparse Snapshot Guard

Sparse project payloads that omit review, comment, or artifact collections still produce deterministic audit packets instead of runtime failures. The empty evidence fixture recommends ${emptyEvidenceResult.summary.recommendedAction} and emits ${emptyEvidenceResult.timelinePacket.events.length} timeline events.

## Invalid Reputation Delta Packet

Malformed review reputation deltas require recertification before profile credit is applied. The invalid-delta fixture recommends ${invalidReputationDeltaResult.summary.recommendedAction}, emits ${invalidReputationDeltaResult.summary.staleReviews} stale review, and normalizes the frozen reputation delta to ${invalidReputationDeltaResult.summary.frozenReputationDelta}.

## Malformed Evidence Entry Packet

Malformed review and inline-comment entries inside otherwise valid evidence arrays are converted into recertification holds instead of crashing or being silently ignored. The malformed-entry fixture recommends ${malformedEvidenceResult.summary.recommendedAction}, emits ${malformedEvidenceResult.summary.staleReviews} stale review and ${malformedEvidenceResult.summary.staleComments} stale inline comment, and creates ${malformedEvidenceResult.recertificationTasks.length} recertification tasks.

## Malformed Evidence Collection Packet

Malformed non-array review and inline-comment collections are converted into recertification holds instead of being treated like omitted evidence. The malformed-collection fixture recommends ${malformedCollectionResult.summary.recommendedAction}, emits ${malformedCollectionResult.summary.staleReviews} stale review and ${malformedCollectionResult.summary.staleComments} stale inline comment, and creates ${malformedCollectionResult.recertificationTasks.length} recertification tasks.

## Backdated Recertification Packet

Recertification timestamps that predate the original review submission are blocked as impossible audit chronology. The backdated-recertification fixture recommends ${backdatedRecertificationResult.summary.recommendedAction}, emits ${backdatedRecertificationResult.summary.staleReviews} stale review, and records ${backdatedRecertificationResult.reviewDecisions[0].reasons.join(', ')} before profile credit is applied.

## Malformed Project Packet

Malformed top-level recertification packets are converted into reviewer-visible recertification holds instead of crashing before timeline evidence is generated. The malformed-project fixture recommends ${malformedProjectResult.summary.recommendedAction}, emits ${malformedProjectResult.summary.staleReviews} stale review hold, and records ${malformedProjectResult.reviewDecisions[0].reasons.join(', ')} for unidentified-project.

## Invalid Project Timestamp Packet

Project snapshot timestamps must be valid before reputation updates can be applied. The invalid-project-timestamp fixture recommends ${invalidProjectTimestampResult.summary.recommendedAction}, emits ${invalidProjectTimestampResult.summary.staleProjectEvidence} project evidence hold, creates ${invalidProjectTimestampResult.recertificationTasks.length} recertification task, and records ${invalidProjectTimestampResult.timelinePacket.generatedAt === null ? 'null generatedAt' : invalidProjectTimestampResult.timelinePacket.generatedAt} in the audit timeline packet.

## Privacy Notes

Double-blind reviewer identifiers are replaced with reviewer-safe anonymous labels in tasks and timeline events. The audit packet uses synthetic data only and does not contain private profile emails, live profile IDs, credentials, or external API output.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#102033"/>
  <rect x="60" y="70" width="1160" height="580" rx="20" fill="#172b44" stroke="#6cc7ff" stroke-width="4"/>
  <text x="100" y="145" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">Peer Review Evidence Recertification</text>
  <text x="100" y="215" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Stale reviews: ${result.summary.staleReviews}</text>
  <text x="100" y="265" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Stale comments: ${result.summary.staleComments}</text>
  <text x="100" y="315" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Frozen reputation delta: ${result.summary.frozenReputationDelta}</text>
  <text x="100" y="365" fill="#ffdf7e" font-family="Arial, sans-serif" font-size="28">Action: ${result.summary.recommendedAction}</text>
  <text x="100" y="445" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Tasks generated: ${result.recertificationTasks.length}</text>
  <text x="100" y="500" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Anonymous reviewer labels preserved without raw identity leakage.</text>
  <text x="100" y="560" fill="#94c9df" font-family="Arial, sans-serif" font-size="18">${result.timelinePacket.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, emptyPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidDeltaPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedEvidencePacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedCollectionPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, backdatedRecertificationPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedProjectPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidProjectTimestampPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Recommended action: ${result.summary.recommendedAction}`);

function buildInvalidReputationDeltaProject() {
  return {
    projectId: 'project-invalid-reputation-delta',
    asOf: '2026-05-30T12:30:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [
      {
        id: 'review-invalid-reputation-delta',
        reviewerId: 'orcid:0000-0002-reviewer-c',
        mode: 'public',
        artifactId: 'analysis-code',
        evidenceDigest: 'sha256:code-v3',
        submittedAt: '2026-05-16T11:00:00Z',
        reputationDelta: '18'
      }
    ],
    inlineComments: []
  };
}

function buildMalformedEvidenceProject() {
  return {
    projectId: 'project-malformed-review-comment-evidence',
    asOf: '2026-05-30T12:35:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [null],
    inlineComments: [null]
  };
}

function buildMalformedCollectionProject() {
  return {
    projectId: 'project-malformed-review-comment-collections',
    asOf: '2026-05-30T12:40:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: {
      id: 'review-object-instead-of-array',
      artifactId: 'analysis-code',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      submittedAt: '2026-05-16T11:00:00Z',
      evidenceDigest: 'sha256:code-v3',
      reputationDelta: 14
    },
    inlineComments: {
      id: 'comment-object-instead-of-array',
      artifactId: 'analysis-code',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  };
}

function buildBackdatedRecertificationProject() {
  return {
    projectId: 'project-backdated-recertification',
    asOf: '2026-05-30T12:45:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-14T09:30:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [
      {
        id: 'review-backdated-recertification',
        reviewerId: 'orcid:0000-0002-reviewer-c',
        mode: 'public',
        artifactId: 'analysis-code',
        evidenceDigest: 'sha256:code-v3',
        submittedAt: '2026-05-16T11:00:00Z',
        recertifiedAt: '2026-05-15T11:00:00Z',
        reputationDelta: 14
      }
    ],
    inlineComments: []
  };
}

function buildInvalidProjectTimestampProject() {
  return {
    projectId: 'project-invalid-project-timestamp',
    asOf: 'not-a-date',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [
      {
        id: 'review-current-with-invalid-project-time',
        reviewerId: 'orcid:0000-0002-reviewer-c',
        mode: 'public',
        artifactId: 'analysis-code',
        evidenceDigest: 'sha256:code-v3',
        submittedAt: '2026-05-16T11:00:00Z',
        reputationDelta: 14
      }
    ],
    inlineComments: []
  };
}
