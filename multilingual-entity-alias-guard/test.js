const assert = require('assert');
const {
  evaluateAliasGuard,
  buildSampleCorpus
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testTrustedTranslatedAliasesBecomeCanonicalGraphNodes() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const crispr = byId(result.entityPackets, 'entity:mesh:D000077768');

  assert.equal(crispr.canonicalName, 'CRISPR-Cas9');
  assert.deepEqual(crispr.languages.sort(), ['de', 'en', 'es']);
  assert.equal(crispr.mentions.length, 3);
  assert.equal(crispr.jsonLd['@type'], 'DefinedTerm');
  assert.equal(crispr.jsonLd.identifier, 'MeSH:D000077768');
}

function testFalseFriendMentionsAreHeldForCuratorReview() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const event = byId(result.mentionDecisions, 'mention-control-es');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'false-friend-or-homograph');
  assert.equal(event.candidateEntityId, 'entity:stat:control-group');

  const action = byId(result.curatorActions, 'curate-mention-control-es');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-homograph');
}

function testSameLanguageAliasCollisionsAreHeldForCuratorReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.entities.push({
    id: 'entity:custom:diabetes-insipidus',
    canonicalName: 'Diabetes Insipidus',
    ontology: 'SCIBASE-MED',
    identifier: 'diabetes-insipidus',
    localizedNames: {
      es: ['diabetes mellitus']
    }
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-es');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'alias-collision');
  assert.deepEqual(event.candidateEntityIds, [
    'entity:custom:diabetes-insipidus',
    'entity:mesh:D003920'
  ]);

  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');
  assert.equal(diabetes.mentions.length, 2);

  const action = byId(result.curatorActions, 'curate-mention-diabetes-es');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-alias-collision');
}

function testConflictingExtractorCandidateAndAliasLookupAreHeld() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions = [
    {
      id: 'mention-diabetes-conflicting-candidate',
      documentId: 'paper-17',
      text: 'diabetes mellitus',
      language: 'es',
      confidence: 0.93,
      candidateEntityId: 'entity:stat:control-group'
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-conflicting-candidate');
  const action = byId(result.curatorActions, 'curate-mention-diabetes-conflicting-candidate');
  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'candidate-alias-conflict');
  assert.deepEqual(event.candidateEntityIds, [
    'entity:mesh:D003920',
    'entity:stat:control-group'
  ]);
  assert.equal(action.action, 'review-multilingual-candidate-alias-conflict');
  assert.equal(action.priority, 'high');
  assert.equal(diabetes.mentions.length, 0);
  assert.equal(result.recommendationGuards.safeEntityIds.includes('entity:mesh:D003920'), false);
}

function testUnicodeAndWhitespaceAliasesMatchCanonicalEntities() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.entities.push({
    id: 'entity:mesh:D005260',
    canonicalName: 'Gene Therapy',
    ontology: 'MeSH',
    identifier: 'D005260',
    localizedNames: {
      es: ['terapia ge\u0301nica']
    }
  });
  corpus.mentions.push({
    id: 'mention-gene-therapy-es',
    documentId: 'paper-9',
    text: '  terapia   g\u00E9nica  ',
    language: 'es',
    confidence: 0.9
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-gene-therapy-es');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(event.reason, 'trusted-translated-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D005260');
}

function testLanguageTagCaseDoesNotSuppressTrustedAliases() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions.push({
    id: 'mention-diabetes-es-uppercase',
    documentId: 'paper-10',
    text: 'diabetes mellitus',
    language: 'ES',
    confidence: 0.92
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-es-uppercase');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(event.reason, 'trusted-translated-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D003920');
  assert.equal(event.preservedLanguageTag, 'ES');
}

function testRegionalLanguageTagsUseBaseAliasLookup() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions.push({
    id: 'mention-diabetes-es-mx',
    documentId: 'paper-11',
    text: 'diabetes mellitus',
    language: 'es-MX',
    confidence: 0.92
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-es-mx');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(event.reason, 'trusted-translated-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D003920');
  assert.equal(event.preservedLanguageTag, 'es-MX');
}

function testRegionalLanguageTagsStillUseBaseHomographHolds() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions.push({
    id: 'mention-control-es-mx',
    documentId: 'paper-12',
    text: 'control',
    language: 'es-MX',
    confidence: 0.88,
    candidateEntityId: 'entity:stat:control-group'
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-control-es-mx');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'false-friend-or-homograph');
  assert.equal(event.candidateEntityId, 'entity:stat:control-group');
  assert.equal(event.preservedLanguageTag, 'es-MX');
}

function testUnderscoreRegionalLanguageTagsUseBaseAliasAndHomographRules() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions.push(
    {
      id: 'mention-diabetes-es-mx-underscore',
      documentId: 'paper-13',
      text: 'diabetes mellitus',
      language: 'es_MX',
      confidence: 0.92
    },
    {
      id: 'mention-control-es-mx-underscore',
      documentId: 'paper-14',
      text: 'control',
      language: 'es_MX',
      confidence: 0.88,
      candidateEntityId: 'entity:stat:control-group'
    }
  );

  const result = evaluateAliasGuard(corpus);
  const aliasEvent = byId(result.mentionDecisions, 'mention-diabetes-es-mx-underscore');
  const homographEvent = byId(result.mentionDecisions, 'mention-control-es-mx-underscore');

  assert.equal(aliasEvent.decision, 'accept-canonical-entity');
  assert.equal(aliasEvent.reason, 'trusted-translated-alias');
  assert.equal(aliasEvent.candidateEntityId, 'entity:mesh:D003920');
  assert.equal(aliasEvent.preservedLanguageTag, 'es_MX');
  assert.equal(homographEvent.decision, 'hold-for-curator-review');
  assert.equal(homographEvent.reason, 'false-friend-or-homograph');
  assert.equal(homographEvent.candidateEntityId, 'entity:stat:control-group');
}

function testMixedScriptLatinLanguageMentionsAreHeldForCuratorReview() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const event = byId(result.mentionDecisions, 'mention-crispr-cyrillic-spoof');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'script-confusable-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D000077768');

  const action = byId(result.curatorActions, 'curate-mention-crispr-cyrillic-spoof');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-script-confusable');
}

function testLowercaseGreekLookalikeLatinMentionsAreHeldForCuratorReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions = [
    {
      id: 'mention-crispr-greek-alpha-spoof',
      documentId: 'paper-15',
      text: 'CRISPR-C\u03B1s9',
      language: 'en',
      confidence: 0.97,
      candidateEntityId: 'entity:mesh:D000077768'
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-crispr-greek-alpha-spoof');
  const action = byId(result.curatorActions, 'curate-mention-crispr-greek-alpha-spoof');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'script-confusable-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D000077768');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-script-confusable');
}

function testLowConfidenceAliasesDoNotDriveRecommendations() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const event = byId(result.mentionDecisions, 'mention-cellule-fr');

  assert.equal(event.decision, 'suppress-recommendation');
  assert.equal(event.reason, 'low-confidence-alias');
  assert.equal(result.recommendationGuards.suppressedMentionIds.includes('mention-cellule-fr'), true);
}

function testMissingConfidenceAliasesDoNotDriveRecommendations() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions = [
    {
      id: 'mention-diabetes-missing-confidence',
      documentId: 'paper-13',
      text: 'diabetes mellitus',
      language: 'es'
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-missing-confidence');
  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');

  assert.equal(event.decision, 'suppress-recommendation');
  assert.equal(event.reason, 'low-confidence-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D003920');
  assert.equal(result.recommendationGuards.suppressedMentionIds.includes('mention-diabetes-missing-confidence'), true);
  assert.equal(result.recommendationGuards.safeEntityIds.includes('entity:mesh:D003920'), false);
  assert.equal(diabetes.mentions.length, 0);
}

function testMissingLocalizedNamesEmitEmptyEntityAliasPacket() {
  const corpus = {
    corpusId: 'kg-sparse-ontology-export-17',
    generatedAt: '2026-05-30T12:00:00Z',
    entities: [
      {
        id: 'entity:mesh:D012345',
        canonicalName: 'Sparse Ontology Entity',
        ontology: 'MeSH',
        identifier: 'D012345'
      }
    ],
    homographs: {},
    mentions: []
  };

  const result = evaluateAliasGuard(corpus);
  const entity = byId(result.entityPackets, 'entity:mesh:D012345');

  assert.deepEqual(entity.localizedNames, {});
  assert.deepEqual(entity.jsonLd.alternateName, []);
  assert.deepEqual(entity.mentions, []);
  assert.equal(result.summary.entityPackets, 1);
  assert.equal(result.summary.acceptedMentions, 0);
  assert.ok(result.auditDigest.startsWith('sha256:'));
}

function testMalformedLocalizedNameTermsAreOmittedFromAliasEvidence() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.entities = [
    {
      id: 'entity:mesh:D003920',
      canonicalName: 'Diabetes Mellitus',
      ontology: 'MeSH',
      identifier: 'D003920',
      localizedNames: {
        es: ['diabetes mellitus', { value: 'diabete mellitus' }]
      }
    }
  ];
  corpus.mentions = [
    {
      id: 'mention-diabetes-es',
      documentId: 'paper-19',
      text: 'diabetes mellitus',
      language: 'es',
      confidence: 0.94
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-es');
  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.deepEqual(diabetes.localizedNames, { es: ['diabetes mellitus'] });
  assert.deepEqual(diabetes.jsonLd.alternateName, ['diabetes mellitus']);
  assert.deepEqual(diabetes.aliasEvidenceIssues, [
    {
      language: 'es',
      reason: 'malformed-localized-name',
      valueType: 'object'
    }
  ]);
}

function testMissingMentionListProducesEmptyAliasReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  delete corpus.mentions;

  const result = evaluateAliasGuard(corpus);

  assert.deepEqual(result.mentionDecisions, []);
  assert.deepEqual(result.curatorActions, []);
  assert.deepEqual(result.recommendationGuards.suppressedMentionIds, []);
  assert.equal(result.summary.acceptedMentions, 0);
  assert.equal(result.summary.heldMentions, 0);
  assert.equal(result.summary.suppressedMentions, 0);
  assert.equal(result.summary.entityPackets, corpus.entities.length);
}

function testMissingHomographPolicyDefaultsToEmptyPolicy() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  delete corpus.homographs;
  corpus.mentions = [
    {
      id: 'mention-diabetes-without-homographs',
      documentId: 'paper-16',
      text: 'diabetes mellitus',
      language: 'es',
      confidence: 0.93
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-without-homographs');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(event.reason, 'trusted-translated-alias');
  assert.equal(event.candidateEntityId, 'entity:mesh:D003920');
  assert.deepEqual(result.curatorActions, []);
}

function testMalformedMentionTextIsHeldForCuratorReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions = [
    {
      id: 'mention-malformed-text',
      documentId: 'paper-18',
      text: { value: 'diabetes mellitus' },
      language: 'es',
      confidence: 0.94,
      candidateEntityId: 'entity:mesh:D003920'
    }
  ];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-malformed-text');
  const action = byId(result.curatorActions, 'curate-mention-malformed-text');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'malformed-mention-text');
  assert.equal(event.candidateEntityId, 'entity:mesh:D003920');
  assert.deepEqual(event.candidateEntityIds, ['entity:mesh:D003920']);
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-malformed-mention');
  assert.equal(result.recommendationGuards.safeEntityIds.includes('entity:mesh:D003920'), false);
}

function testMalformedMentionEntriesAreHeldForCuratorReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.mentions = [null];

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'malformed-mention-entry-1');
  const action = byId(result.curatorActions, 'curate-malformed-mention-entry-1');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'malformed-mention-entry');
  assert.equal(event.valueType, 'null');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-malformed-mention');
  assert.equal(result.recommendationGuards.safeEntityIds.includes('entity:mesh:D003920'), false);
}

function testMalformedTopLevelCorpusIsHeldForCuratorReview() {
  const result = evaluateAliasGuard(null);
  const event = byId(result.mentionDecisions, 'malformed-corpus-packet');
  const action = byId(result.curatorActions, 'curate-malformed-corpus-packet');

  assert.equal(result.corpusId, 'unidentified-corpus');
  assert.equal(result.generatedAt, null);
  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'malformed-corpus-packet');
  assert.equal(event.valueType, 'null');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-malformed-corpus');
  assert.deepEqual(result.entityPackets, []);
  assert.deepEqual(result.recommendationGuards.safeEntityIds, []);
  assert.deepEqual(result.recommendationGuards.suppressedMentionIds, ['malformed-corpus-packet']);
  assert.equal(result.summary.heldMentions, 1);
  assert.ok(result.auditDigest.startsWith('sha256:'));
}

function testLanguageTaggedSynonymsArePreservedForEntityPages() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');

  assert.deepEqual(diabetes.localizedNames, {
    en: ['diabetes mellitus'],
    de: ['Diabetes mellitus'],
    es: ['diabetes mellitus']
  });
  assert.equal(diabetes.schemaOrg.about.length, 3);
}

function testInstrumentAliasesRemainTypedGraphNodesWithoutCalibrationClaims() {
  const corpus = {
    corpusId: 'kg-instrument-alias-upload-batch-17',
    generatedAt: '2026-06-13T18:40:00Z',
    entities: [
      {
        id: 'entity:instrument:lc-ms-ms',
        canonicalName: 'Liquid chromatography tandem mass spectrometry',
        ontology: 'SCIBASE-INSTRUMENT',
        identifier: 'lc-ms-ms',
        entityType: 'scientific-instrument',
        localizedNames: {
          en: ['LC-MS/MS'],
          de: ['Fluessigchromatographie Tandem Massenspektrometrie'],
          es: ['cromatografia liquida espectrometria de masas en tandem']
        }
      }
    ],
    homographs: {},
    mentions: [
      {
        id: 'mention-lcms-de',
        documentId: 'instrument-paper-1',
        text: 'Fluessigchromatographie Tandem Massenspektrometrie',
        language: 'de',
        confidence: 0.94
      }
    ]
  };

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-lcms-de');
  const instrument = byId(result.entityPackets, 'entity:instrument:lc-ms-ms');

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(event.reason, 'trusted-translated-alias');
  assert.equal(instrument.entityType, 'scientific-instrument');
  assert.equal(instrument.jsonLd.additionalType, 'scientific-instrument');
  assert.equal(instrument.schemaOrg.about[0].additionalType, 'scientific-instrument');
  assert.deepEqual(result.recommendationGuards.safeEntityIds, ['entity:instrument:lc-ms-ms']);
  assert.equal(JSON.stringify(instrument).includes('calibrationCertificate'), false);
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const result = evaluateAliasGuard(buildSampleCorpus());

  assert.ok(result.auditDigest.startsWith('sha256:'));
  assert.equal(result.summary.acceptedMentions, 6);
  assert.equal(result.summary.heldMentions, 3);
  assert.equal(result.summary.suppressedMentions, 1);
  assert.ok(!JSON.stringify(result).includes('private@'));
}

function testPrivateEntityTypeIsOmittedFromGraphPackets() {
  const corpus = {
    corpusId: 'corpus-instrument-private-type',
    generatedAt: '2026-05-28T10:15:00Z',
    entities: [
      {
        id: 'entity:instrument:lc-ms-ms',
        canonicalName: 'Liquid chromatography tandem mass spectrometry',
        ontology: 'SCIBASE-INSTRUMENT',
        identifier: 'lc-ms-ms',
        entityType: 'scientific-instrument C:\\Users\\Alice\\private-lab',
        localizedNames: {
          en: ['LC-MS/MS'],
          de: ['Fluessigchromatographie Tandem Massenspektrometrie']
        }
      }
    ],
    homographs: {},
    mentions: [
      {
        id: 'mention-lcms-de',
        documentId: 'instrument-paper-1',
        text: 'Fluessigchromatographie Tandem Massenspektrometrie',
        language: 'de',
        confidence: 0.94
      }
    ]
  };

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-lcms-de');
  const instrument = byId(result.entityPackets, 'entity:instrument:lc-ms-ms');
  const packetJson = JSON.stringify(result);

  assert.equal(event.decision, 'accept-canonical-entity');
  assert.equal(Object.hasOwn(instrument, 'entityType'), false);
  assert.equal(Object.hasOwn(instrument.jsonLd, 'additionalType'), false);
  assert.equal(Object.hasOwn(instrument.schemaOrg.about[0], 'additionalType'), false);
  assert.equal(packetJson.includes('C:\\Users\\Alice'), false);
  assert.equal(packetJson.includes('private-lab'), false);
}

const tests = [
  testTrustedTranslatedAliasesBecomeCanonicalGraphNodes,
  testFalseFriendMentionsAreHeldForCuratorReview,
  testSameLanguageAliasCollisionsAreHeldForCuratorReview,
  testConflictingExtractorCandidateAndAliasLookupAreHeld,
  testUnicodeAndWhitespaceAliasesMatchCanonicalEntities,
  testLanguageTagCaseDoesNotSuppressTrustedAliases,
  testRegionalLanguageTagsUseBaseAliasLookup,
  testRegionalLanguageTagsStillUseBaseHomographHolds,
  testUnderscoreRegionalLanguageTagsUseBaseAliasAndHomographRules,
  testMixedScriptLatinLanguageMentionsAreHeldForCuratorReview,
  testLowercaseGreekLookalikeLatinMentionsAreHeldForCuratorReview,
  testLowConfidenceAliasesDoNotDriveRecommendations,
  testMissingConfidenceAliasesDoNotDriveRecommendations,
  testMissingLocalizedNamesEmitEmptyEntityAliasPacket,
  testMalformedLocalizedNameTermsAreOmittedFromAliasEvidence,
  testMissingMentionListProducesEmptyAliasReview,
  testMissingHomographPolicyDefaultsToEmptyPolicy,
  testMalformedMentionTextIsHeldForCuratorReview,
  testMalformedMentionEntriesAreHeldForCuratorReview,
  testMalformedTopLevelCorpusIsHeldForCuratorReview,
  testLanguageTaggedSynonymsArePreservedForEntityPages,
  testInstrumentAliasesRemainTypedGraphNodesWithoutCalibrationClaims,
  testAuditDigestIsDeterministicAndPrivateFree,
  testPrivateEntityTypeIsOmittedFromGraphPackets
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} multilingual entity alias guard tests passed`);
