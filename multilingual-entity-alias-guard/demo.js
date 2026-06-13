const fs = require('fs');
const path = require('path');
const { evaluateAliasGuard, buildSampleCorpus } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateAliasGuard(buildSampleCorpus());
const sparseResult = evaluateAliasGuard({
  corpusId: 'kg-sparse-ontology-export-17',
  generatedAt: '2026-05-30T12:00:00Z',
  entities: [
    {
      id: 'entity:mesh:D012345',
      canonicalName: 'Sparse Ontology Entity',
      ontology: 'MeSH',
      identifier: 'D012345'
    }
  ]
});
const conflictResult = evaluateAliasGuard({
  ...buildSampleCorpus(),
  corpusId: 'kg-candidate-alias-conflict-17',
  generatedAt: '2026-05-30T12:30:00Z',
  mentions: [
    {
      id: 'mention-diabetes-conflicting-candidate',
      documentId: 'paper-17',
      text: 'diabetes mellitus',
      language: 'es',
      confidence: 0.93,
      candidateEntityId: 'entity:stat:control-group'
    }
  ]
});
const malformedMentionResult = evaluateAliasGuard({
  ...buildSampleCorpus(),
  corpusId: 'kg-malformed-mention-text-17',
  generatedAt: '2026-05-31T10:45:00Z',
  mentions: [
    {
      id: 'mention-malformed-text',
      documentId: 'paper-18',
      text: { value: 'diabetes mellitus' },
      language: 'es',
      confidence: 0.94,
      candidateEntityId: 'entity:mesh:D003920'
    }
  ]
});
const malformedMentionEntryResult = evaluateAliasGuard({
  ...buildSampleCorpus(),
  corpusId: 'kg-malformed-mention-entry-17',
  generatedAt: '2026-06-01T18:55:00Z',
  mentions: [null]
});
const malformedAliasEvidenceResult = evaluateAliasGuard({
  ...buildSampleCorpus(),
  corpusId: 'kg-malformed-localized-name-17',
  generatedAt: '2026-05-31T10:46:00Z',
  entities: [
    {
      id: 'entity:mesh:D003920',
      canonicalName: 'Diabetes Mellitus',
      ontology: 'MeSH',
      identifier: 'D003920',
      localizedNames: {
        es: ['diabetes mellitus', { value: 'diabete mellitus' }]
      }
    }
  ],
  mentions: [
    {
      id: 'mention-diabetes-es',
      documentId: 'paper-19',
      text: 'diabetes mellitus',
      language: 'es',
      confidence: 0.94
    }
  ]
});
const malformedCorpusResult = evaluateAliasGuard(null);

const packetPath = path.join(reportsDir, 'alias-guard-packet.json');
const sparsePacketPath = path.join(reportsDir, 'sparse-alias-guard-packet.json');
const conflictPacketPath = path.join(reportsDir, 'candidate-alias-conflict-packet.json');
const malformedMentionPacketPath = path.join(reportsDir, 'malformed-mention-text-packet.json');
const malformedMentionEntryPacketPath = path.join(reportsDir, 'malformed-mention-entry-packet.json');
const malformedAliasEvidencePacketPath = path.join(reportsDir, 'malformed-alias-evidence-packet.json');
const malformedCorpusPacketPath = path.join(reportsDir, 'malformed-corpus-packet.json');
const reportPath = path.join(reportsDir, 'alias-guard-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(sparsePacketPath, `${JSON.stringify(sparseResult, null, 2)}\n`);
fs.writeFileSync(conflictPacketPath, `${JSON.stringify(conflictResult, null, 2)}\n`);
fs.writeFileSync(malformedMentionPacketPath, `${JSON.stringify(malformedMentionResult, null, 2)}\n`);
fs.writeFileSync(
  malformedMentionEntryPacketPath,
  `${JSON.stringify(malformedMentionEntryResult, null, 2)}\n`
);
fs.writeFileSync(malformedAliasEvidencePacketPath, `${JSON.stringify(malformedAliasEvidenceResult, null, 2)}\n`);
fs.writeFileSync(malformedCorpusPacketPath, `${JSON.stringify(malformedCorpusResult, null, 2)}\n`);

const accepted = result.mentionDecisions
  .filter((decision) => decision.decision === 'accept-canonical-entity')
  .map((decision) => `- ${decision.id}: ${decision.text} (${decision.language}) -> ${decision.candidateEntityId}`)
  .join('\n');

const held = result.curatorActions
  .map((action) => `- ${action.id}: ${action.action} (${action.language}:${action.text})`)
  .join('\n');

const markdown = `# Multilingual Entity Alias Guard

Corpus: ${result.corpusId}
Generated: ${result.generatedAt}

## Summary

- Accepted mentions: ${result.summary.acceptedMentions}
- Held curator-review mentions: ${result.summary.heldMentions}
- Suppressed low-confidence mentions: ${result.summary.suppressedMentions}
- Entity packets emitted: ${result.summary.entityPackets}
- Audit digest: ${result.auditDigest}

## Accepted Canonical Mappings

${accepted}

## Curator Actions

${held}

## Recommendation Guard

Held or suppressed mentions are not allowed to drive entity-page recommendations until a curator verifies the alias mapping.

## Sparse Corpus Guard

Sparse ontology or corpus exports that omit localized names, mention lists, or homograph policy still produce deterministic graph review evidence. The sparse fixture emitted ${sparseResult.summary.entityPackets} entity packet and ${sparseResult.mentionDecisions.length} mention decisions.

## Candidate Alias Conflict Guard

Extractor candidates that disagree with trusted multilingual alias lookup are held for curator review instead of silently overriding the upstream candidate. The conflict fixture decision is ${conflictResult.mentionDecisions[0].decision} with reason ${conflictResult.mentionDecisions[0].reason}.

## Malformed Mention Text Guard

Malformed mention text values are held for curator review instead of crashing alias normalization. The malformed fixture decision is ${malformedMentionResult.mentionDecisions[0].decision} with reason ${malformedMentionResult.mentionDecisions[0].reason}, and it emits ${malformedMentionResult.curatorActions[0].action}.

## Malformed Mention Entry Guard

Malformed mention rows such as null entries are held for curator review instead of crashing before graph packets are produced. The malformed entry fixture decision is ${malformedMentionEntryResult.mentionDecisions[0].decision} with reason ${malformedMentionEntryResult.mentionDecisions[0].reason}, and it emits ${malformedMentionEntryResult.curatorActions[0].action}.

## Malformed Alias Evidence Guard

Malformed localized-name evidence is omitted from alias lookup and JSON-LD alternate names instead of crashing ontology review. The malformed alias fixture records ${malformedAliasEvidenceResult.entityPackets[0].aliasEvidenceIssues.length} alias evidence issue with reason ${malformedAliasEvidenceResult.entityPackets[0].aliasEvidenceIssues[0].reason}.

## Malformed Corpus Guard

Malformed top-level corpus packets are held for curator review instead of crashing before graph evidence is produced. The malformed corpus fixture emits ${malformedCorpusResult.mentionDecisions[0].reason}, ${malformedCorpusResult.curatorActions[0].action}, and no recommendation-safe entity IDs.

## Safety

All fixtures are synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0c2130"/>
  <rect x="54" y="58" width="1172" height="604" rx="18" fill="#142f42" stroke="#7bd88f" stroke-width="4"/>
  <text x="96" y="136" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">Multilingual Entity Alias Guard</text>
  <text x="96" y="210" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Accepted canonical mentions: ${result.summary.acceptedMentions}</text>
  <text x="96" y="260" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Held curator-review mentions: ${result.summary.heldMentions}</text>
  <text x="96" y="310" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Suppressed low-confidence mentions: ${result.summary.suppressedMentions}</text>
  <text x="96" y="380" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Languages preserved: en, de, es, fr</text>
  <text x="96" y="430" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">JSON-LD entity packets ready for schema.org-style pages</text>
  <text x="96" y="510" fill="#ffd37a" font-family="Arial, sans-serif" font-size="26">Unsafe or malformed aliases are held before recommendations are shown.</text>
  <text x="96" y="574" fill="#a6d7c3" font-family="Arial, sans-serif" font-size="18">${result.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, sparsePacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, conflictPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedMentionPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedMentionEntryPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedAliasEvidencePacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedCorpusPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Accepted mentions: ${result.summary.acceptedMentions}`);
console.log(`Suppressed mentions: ${result.summary.suppressedMentions}`);
