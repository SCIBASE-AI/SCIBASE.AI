const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function evidenceList(value) {
  return Array.isArray(value) ? value : [];
}

function valueType(value) {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

function isCorpusObject(corpus) {
  return Boolean(corpus && typeof corpus === 'object' && !Array.isArray(corpus));
}

function malformedCorpusPacket(corpus) {
  const decision = {
    id: 'malformed-corpus-packet',
    language: null,
    text: null,
    documentId: null,
    decision: 'hold-for-curator-review',
    reason: 'malformed-corpus-packet',
    valueType: valueType(corpus),
    candidateEntityId: null,
    candidateEntityIds: [],
    confidence: null,
    preservedLanguageTag: null
  };
  const entityPackets = [];
  const curatorActions = [curatorActionForDecision(decision)];
  const summary = {
    acceptedMentions: 0,
    heldMentions: 1,
    suppressedMentions: 0,
    entityPackets: 0
  };

  return {
    corpusId: 'unidentified-corpus',
    generatedAt: null,
    mentionDecisions: [decision],
    entityPackets,
    curatorActions,
    recommendationGuards: {
      suppressedMentionIds: [decision.id],
      safeEntityIds: []
    },
    summary,
    auditDigest: digest({
      corpusId: 'unidentified-corpus',
      mentionDecisions: [decision],
      entityPackets,
      curatorActions,
      summary
    })
  };
}

function localizedNamesFor(entity) {
  const localizedNames =
    entity.localizedNames && typeof entity.localizedNames === 'object' ? entity.localizedNames : {};
  return Object.fromEntries(
    Object.entries(localizedNames)
      .map(([language, terms]) => [language, evidenceList(terms).filter(isTextValue)])
      .filter(([, terms]) => terms.length > 0)
  );
}

function localizedNameIssuesFor(entity) {
  const localizedNames =
    entity.localizedNames && typeof entity.localizedNames === 'object' ? entity.localizedNames : {};
  const issues = [];

  for (const [language, terms] of Object.entries(localizedNames)) {
    if (!Array.isArray(terms)) {
      issues.push({
        language,
        reason: 'malformed-localized-name-list',
        valueType: valueType(terms)
      });
      continue;
    }

    for (const term of terms) {
      if (!isTextValue(term)) {
        issues.push({
          language,
          reason: 'malformed-localized-name',
          valueType: valueType(term)
        });
      }
    }
  }

  return issues;
}

function evidenceObject(value) {
  return value && typeof value === 'object' ? value : {};
}

const LATIN_SCRIPT_LANGUAGES = new Set([
  'ca',
  'cs',
  'da',
  'de',
  'en',
  'es',
  'fi',
  'fr',
  'hr',
  'hu',
  'id',
  'it',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'sk',
  'sl',
  'sv',
  'tr',
  'vi'
]);

const LATIN_LETTER_RE = /[A-Za-z\u00C0-\u024F]/u;
const CYRILLIC_LATIN_CONFUSABLE_RE = /[\u0405\u0410\u0412\u0415\u041A\u041C\u041D\u041E\u0420\u0421\u0422\u0425\u0430\u0435\u043E\u0440\u0441\u0445\u0455]/u;
const GREEK_LATIN_CONFUSABLE_RE = /[\u0391\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u039D\u039F\u03A1\u03A4\u03A5\u03A7\u03B1\u03B5\u03B9\u03BA\u03BC\u03BD\u03BF\u03C1\u03C4\u03C5\u03C7]/u;

function normalizeTerm(term) {
  return term.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function isTextValue(value) {
  return typeof value === 'string';
}

function safeEntityType(value) {
  if (!isTextValue(value)) return null;
  const trimmed = value.trim();
  if (!trimmed || containsPrivateReference(trimmed)) return null;
  return /^[a-z0-9][a-z0-9:_./ -]{0,80}$/i.test(trimmed) ? trimmed : null;
}

function containsPrivateReference(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|orcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]|(?:file:\/\/|[A-Z]:[\\/]Users[\\/][^ \s"')]+|\/Users\/[^ \s"')]+|\/home\/[^ \s"')]+|private-lab|patient-export)/i.test(value);
}

function normalizeLanguageTag(language) {
  return String(language || '').normalize('NFKC').trim().replace(/_/g, '-').toLocaleLowerCase();
}

function languageLookupKeys(language) {
  const normalized = normalizeLanguageTag(language);
  if (!normalized) return [''];

  const primary = normalized.split('-')[0];
  return primary && primary !== normalized ? [normalized, primary] : [normalized];
}

function primaryLanguage(language) {
  return normalizeLanguageTag(language).split('-')[0] || '';
}

function hasMixedScriptConfusableRisk(mention) {
  const primary = primaryLanguage(mention.language);
  if (!LATIN_SCRIPT_LANGUAGES.has(primary)) {
    return false;
  }

  const text = String(mention.text || '').normalize('NFKC');
  return (
    LATIN_LETTER_RE.test(text) &&
    (CYRILLIC_LATIN_CONFUSABLE_RE.test(text) || GREEK_LATIN_CONFUSABLE_RE.test(text))
  );
}

function confidenceScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function buildAliasIndex(entities) {
  const index = new Map();

  for (const entity of evidenceList(entities)) {
    for (const [language, terms] of Object.entries(localizedNamesFor(entity))) {
      for (const term of evidenceList(terms)) {
        const key = `${normalizeLanguageTag(language)}:${normalizeTerm(term)}`;
        const existing = index.get(key);

        if (!existing) {
          index.set(key, {
            kind: 'alias',
            entity,
            language,
            term
          });
          continue;
        }

        const entitiesForAlias =
          existing.kind === 'collision' ? existing.entities.slice() : [existing.entity];

        if (entitiesForAlias.some((candidate) => candidate.id === entity.id)) {
          continue;
        }

        entitiesForAlias.push(entity);
        index.set(key, {
          kind: 'collision',
          entities: entitiesForAlias,
          entityIds: entitiesForAlias.map((candidate) => candidate.id).sort(),
          language,
          term
        });
      }
    }
  }

  return index;
}

function mentionDecision(mention, aliasIndex, homographs, index) {
  if (!mention || typeof mention !== 'object' || Array.isArray(mention)) {
    return {
      id: `malformed-mention-entry-${index + 1}`,
      language: null,
      text: null,
      documentId: null,
      decision: 'hold-for-curator-review',
      reason: 'malformed-mention-entry',
      valueType: valueType(mention),
      candidateEntityId: null,
      candidateEntityIds: [],
      confidence: null,
      preservedLanguageTag: null
    };
  }

  const languageKeys = languageLookupKeys(mention.language);
  if (!isTextValue(mention.text)) {
    const candidateEntityId = mention.candidateEntityId || null;
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'malformed-mention-text',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  const termKey = normalizeTerm(mention.text);
  const aliasEntry = languageKeys
    .map((languageKey) => aliasIndex.get(`${languageKey}:${termKey}`))
    .find(Boolean);
  const alias = aliasEntry && aliasEntry.kind === 'alias' ? aliasEntry : null;
  const candidateEntityId = alias ? alias.entity.id : mention.candidateEntityId || null;
  const homographEntry = languageKeys
    .map((languageKey) => homographs[`${languageKey}:${termKey}`])
    .find(Boolean);
  const confidence = confidenceScore(mention.confidence);

  if (hasMixedScriptConfusableRisk(mention)) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'script-confusable-alias',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (homographEntry) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'false-friend-or-homograph',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (aliasEntry && aliasEntry.kind === 'collision') {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'alias-collision',
      candidateEntityId: null,
      candidateEntityIds: aliasEntry.entityIds,
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (alias && mention.candidateEntityId && mention.candidateEntityId !== alias.entity.id) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'hold-for-curator-review',
      reason: 'candidate-alias-conflict',
      candidateEntityId: null,
      candidateEntityIds: [alias.entity.id, mention.candidateEntityId].sort(),
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  if (!alias || confidence === null || confidence < 0.8) {
    return {
      id: mention.id,
      language: mention.language,
      text: mention.text,
      documentId: mention.documentId,
      decision: 'suppress-recommendation',
      reason: alias || candidateEntityId ? 'low-confidence-alias' : 'unknown-alias',
      candidateEntityId,
      candidateEntityIds: candidateEntityId ? [candidateEntityId] : [],
      confidence: mention.confidence,
      preservedLanguageTag: mention.language
    };
  }

  return {
    id: mention.id,
    language: mention.language,
    text: mention.text,
    documentId: mention.documentId,
    decision: 'accept-canonical-entity',
    reason: 'trusted-translated-alias',
    candidateEntityId: alias.entity.id,
    candidateEntityIds: [alias.entity.id],
    confidence: mention.confidence,
    preservedLanguageTag: mention.language
  };
}

function curatorActionForDecision(decision) {
  if (decision.decision === 'accept-canonical-entity') {
    return null;
  }

  return {
    id: `curate-${decision.id}`,
    mentionId: decision.id,
    action:
      decision.reason === 'alias-collision'
        ? 'review-multilingual-alias-collision'
        : decision.reason === 'candidate-alias-conflict'
        ? 'review-multilingual-candidate-alias-conflict'
        : decision.reason === 'script-confusable-alias'
        ? 'review-multilingual-script-confusable'
        : decision.reason === 'malformed-corpus-packet'
        ? 'review-multilingual-malformed-corpus'
        : decision.reason === 'malformed-mention-text' ||
          decision.reason === 'malformed-mention-entry'
        ? 'review-multilingual-malformed-mention'
        : decision.reason === 'false-friend-or-homograph'
        ? 'review-multilingual-homograph'
        : 'verify-translated-alias-before-recommendation',
    priority:
      decision.reason === 'false-friend-or-homograph' ||
      decision.reason === 'alias-collision' ||
      decision.reason === 'candidate-alias-conflict' ||
      decision.reason === 'script-confusable-alias' ||
      decision.reason === 'malformed-corpus-packet' ||
      decision.reason === 'malformed-mention-text' ||
      decision.reason === 'malformed-mention-entry'
        ? 'high'
        : 'normal',
    language: decision.language,
    text: decision.text,
    candidateEntityId: decision.candidateEntityId,
    candidateEntityIds: decision.candidateEntityIds,
    reason: decision.reason
  };
}

function buildEntityPackets(entities, decisions) {
  return evidenceList(entities).map((entity) => {
    const localizedNames = localizedNamesFor(entity);
    const aliasEvidenceIssues = localizedNameIssuesFor(entity);
    const entityType = safeEntityType(entity.entityType);
    const accepted = decisions.filter(
      (decision) =>
        decision.decision === 'accept-canonical-entity' && decision.candidateEntityId === entity.id
    );
    const languages = Array.from(new Set(accepted.map((decision) => decision.language))).sort();
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: entity.canonicalName,
      identifier: `${entity.ontology}:${entity.identifier}`,
      inDefinedTermSet: entity.ontology,
      alternateName: Object.values(localizedNames).flat()
    };

    if (entityType) {
      jsonLd.additionalType = entityType;
    }

    const packet = {
      id: entity.id,
      canonicalName: entity.canonicalName,
      ontology: entity.ontology,
      identifier: entity.identifier,
      languages,
      aliasEvidenceIssues,
      mentions: accepted.map((decision) => ({
        id: decision.id,
        text: decision.text,
        language: decision.language,
        documentId: decision.documentId,
        confidence: decision.confidence
      })),
      localizedNames,
      jsonLd,
      schemaOrg: {
        '@type': 'ScholarlyArticle',
        about: accepted.map((decision) => {
          const aboutTerm = {
            '@type': 'DefinedTerm',
            name: decision.text,
            inLanguage: decision.language,
            identifier: `${entity.ontology}:${entity.identifier}`
          };

          if (entityType) {
            aboutTerm.additionalType = entityType;
          }

          return aboutTerm;
        })
      }
    };

    if (entityType) {
      packet.entityType = entityType;
    }

    return packet;
  });
}

function evaluateAliasGuard(corpus) {
  if (!isCorpusObject(corpus)) {
    return malformedCorpusPacket(corpus);
  }

  const aliasIndex = buildAliasIndex(corpus.entities);
  const mentionDecisions = evidenceList(corpus.mentions).map((mention, index) =>
    mentionDecision(mention, aliasIndex, evidenceObject(corpus.homographs), index)
  );
  const curatorActions = mentionDecisions.map(curatorActionForDecision).filter(Boolean);
  const entityPackets = buildEntityPackets(corpus.entities, mentionDecisions);
  const suppressedMentionIds = mentionDecisions
    .filter((decision) => decision.decision !== 'accept-canonical-entity')
    .map((decision) => decision.id);

  const summary = {
    acceptedMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'accept-canonical-entity'
    ).length,
    heldMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'hold-for-curator-review'
    ).length,
    suppressedMentions: mentionDecisions.filter(
      (decision) => decision.decision === 'suppress-recommendation'
    ).length,
    entityPackets: entityPackets.length
  };

  return {
    corpusId: corpus.corpusId,
    generatedAt: corpus.generatedAt,
    mentionDecisions,
    entityPackets,
    curatorActions,
    recommendationGuards: {
      suppressedMentionIds,
      safeEntityIds: entityPackets
        .filter((packet) => packet.mentions.length > 0)
        .map((packet) => packet.id)
    },
    summary,
    auditDigest: digest({
      corpusId: corpus.corpusId,
      mentionDecisions,
      entityPackets,
      curatorActions,
      summary
    })
  };
}

function buildSampleCorpus() {
  return {
    corpusId: 'kg-multilingual-upload-batch-17',
    generatedAt: '2026-05-28T07:00:00Z',
    entities: [
      {
        id: 'entity:mesh:D000077768',
        canonicalName: 'CRISPR-Cas9',
        ontology: 'MeSH',
        identifier: 'D000077768',
        localizedNames: {
          en: ['CRISPR-Cas9'],
          de: ['CRISPR-Cas9 Geneditierung'],
          es: ['edicion genetica CRISPR-Cas9']
        }
      },
      {
        id: 'entity:mesh:D003920',
        canonicalName: 'Diabetes Mellitus',
        ontology: 'MeSH',
        identifier: 'D003920',
        localizedNames: {
          en: ['diabetes mellitus'],
          de: ['Diabetes mellitus'],
          es: ['diabetes mellitus']
        }
      },
      {
        id: 'entity:stat:control-group',
        canonicalName: 'Control Group',
        ontology: 'SCIBASE-STAT',
        identifier: 'control-group',
        localizedNames: {
          en: ['control group'],
          es: ['grupo control'],
          de: ['Kontrollgruppe']
        }
      }
    ],
    homographs: {
      'es:control': {
        note: 'Spanish control may refer to monitoring or governance, not necessarily a statistical control group.'
      }
    },
    mentions: [
      {
        id: 'mention-crispr-en',
        documentId: 'paper-1',
        text: 'CRISPR-Cas9',
        language: 'en',
        confidence: 0.97
      },
      {
        id: 'mention-crispr-de',
        documentId: 'paper-2',
        text: 'CRISPR-Cas9 Geneditierung',
        language: 'de',
        confidence: 0.91
      },
      {
        id: 'mention-crispr-es',
        documentId: 'paper-3',
        text: 'edicion genetica CRISPR-Cas9',
        language: 'es',
        confidence: 0.89
      },
      {
        id: 'mention-diabetes-en',
        documentId: 'paper-4',
        text: 'diabetes mellitus',
        language: 'en',
        confidence: 0.94
      },
      {
        id: 'mention-diabetes-de',
        documentId: 'paper-5',
        text: 'Diabetes mellitus',
        language: 'de',
        confidence: 0.95
      },
      {
        id: 'mention-diabetes-es',
        documentId: 'paper-6',
        text: 'diabetes mellitus',
        language: 'es',
        confidence: 0.93
      },
      {
        id: 'mention-control-es',
        documentId: 'paper-7',
        text: 'control',
        language: 'es',
        confidence: 0.88,
        candidateEntityId: 'entity:stat:control-group'
      },
      {
        id: 'mention-cellule-fr',
        documentId: 'paper-8',
        text: 'cellule',
        language: 'fr',
        confidence: 0.61,
        candidateEntityId: 'entity:mesh:D002477'
      },
      {
        id: 'mention-crispr-cyrillic-spoof',
        documentId: 'paper-9',
        text: '\u0421RISPR-Cas9',
        language: 'en',
        confidence: 0.97,
        candidateEntityId: 'entity:mesh:D000077768'
      },
      {
        id: 'mention-crispr-greek-alpha-spoof',
        documentId: 'paper-10',
        text: 'CRISPR-C\u03B1s9',
        language: 'en',
        confidence: 0.97,
        candidateEntityId: 'entity:mesh:D000077768'
      }
    ]
  };
}

module.exports = {
  evaluateAliasGuard,
  buildSampleCorpus,
  digest
};
