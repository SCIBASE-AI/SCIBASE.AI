const crypto = require('crypto');

const REQUIRED_SECTIONS = ['background', 'methods', 'results', 'conclusions'];

function assessStructuredAbstract(manuscript) {
  const manuscriptRecord = manuscriptRecordFor(manuscript);
  const findings = dedupeFindings([
    ...assessManuscriptShape(manuscriptRecord),
    ...assessAssessmentTimestamp(manuscriptRecord),
    ...assessSourceEvidence(manuscriptRecord),
    ...assessRequiredSections(manuscriptRecord),
    ...assessMethodsAlignment(manuscriptRecord),
    ...assessResultsAlignment(manuscriptRecord),
    ...assessConclusionBalance(manuscriptRecord)
  ]).sort(compareFindings);

  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    manuscriptId: manuscriptRecord.manuscriptId,
    status: chooseStatus(blockerCount, warningCount),
    reviewLanes: chooseReviewLanes(blockerCount, warningCount),
    findings,
    actions: buildActions(manuscriptRecord, findings),
    abstractSignals: buildSignals(findings),
    assessedAt: manuscriptRecord.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function manuscriptRecordFor(manuscript) {
  if (isEvidenceObject(manuscript)) return manuscript;
  return {
    manuscriptId: 'unknown-manuscript',
    assessedAt: null,
    abstract: {},
    __malformedManuscriptPacket: true
  };
}

function assessManuscriptShape(manuscript) {
  if (!manuscript.__malformedManuscriptPacket) return [];
  return [
    finding({
      code: 'MALFORMED_MANUSCRIPT_PACKET',
      severity: 'blocker',
      target: 'manuscript',
      message: 'Structured abstract manuscript packet is malformed and cannot release AI peer-review evidence.'
    })
  ];
}

function assessAssessmentTimestamp(manuscript) {
  if (manuscript.__malformedManuscriptPacket || hasValidTimestamp(manuscript.assessedAt)) return [];
  return [
    finding({
      code: 'INVALID_ASSESSMENT_TIMESTAMP',
      severity: 'blocker',
      target: 'assessedAt',
      message: 'Structured abstract assessment timestamp must be a valid ISO-style timestamp before AI peer-review evidence can release.'
    })
  ];
}

function assessSourceEvidence(manuscript) {
  const findings = [];
  const hasMethodsEvidence = isEvidenceObject(manuscript.methods);
  const hasResultsEvidence = isEvidenceObject(manuscript.results);

  if (!hasMethodsEvidence) {
    findings.push(finding({
      code: 'MISSING_METHODS_EVIDENCE',
      severity: 'blocker',
      target: 'methods',
      message: 'Structured abstract release requires a source methods evidence packet.'
    }));
  } else if (!hasText(manuscript.methods.primaryEndpoint)) {
    findings.push(finding({
      code: 'MISSING_METHODS_ENDPOINT',
      severity: 'blocker',
      target: 'methods.primaryEndpoint',
      message: 'Methods evidence must name the primary endpoint before structured abstract release.'
    }));
  }

  if (hasMethodsEvidence) {
    findings.push(...unsafeSourceEvidenceFindings('methods', manuscript.methods));
  }

  if (!hasResultsEvidence) {
    findings.push(finding({
      code: 'MISSING_RESULTS_EVIDENCE',
      severity: 'blocker',
      target: 'results',
      message: 'Structured abstract release requires a source results evidence packet.'
    }));
  } else if (!hasText(manuscript.results.primaryEndpoint)) {
    findings.push(finding({
      code: 'MISSING_RESULTS_ENDPOINT',
      severity: 'blocker',
      target: 'results.primaryEndpoint',
      message: 'Results evidence must name the primary endpoint before structured abstract release.'
    }));
  }

  if (hasResultsEvidence) {
    findings.push(...unsafeSourceEvidenceFindings('results', manuscript.results));
  }

  if (
    hasMethodsEvidence
    && hasResultsEvidence
    && hasText(manuscript.methods.primaryEndpoint)
    && hasText(manuscript.results.primaryEndpoint)
    && normalize(manuscript.methods.primaryEndpoint) !== normalize(manuscript.results.primaryEndpoint)
  ) {
    findings.push(finding({
      code: 'SOURCE_ENDPOINT_MISMATCH',
      severity: 'blocker',
      target: 'methods.primaryEndpoint',
      message: `Methods evidence primary endpoint (${manuscript.methods.primaryEndpoint}) does not match results evidence primary endpoint (${manuscript.results.primaryEndpoint}).`
    }));
  }

  return findings;
}

function unsafeSourceEvidenceFindings(targetPrefix, evidence) {
  const statusField = unsafeSourceEvidenceStatusField(evidence);
  if (!statusField) return [];
  const statusLabel = unsafeSourceEvidenceStatusLabel(evidence[statusField]);

  return [
    finding({
      code: 'SOURCE_EVIDENCE_UNSAFE',
      severity: 'blocker',
      target: `${targetPrefix}.${statusField}`,
      message: `Structured abstract release requires current source evidence; ${targetPrefix} evidence is marked ${statusLabel}.`
    })
  ];
}

function assessRequiredSections(manuscript) {
  const abstract = manuscript.abstract || {};
  return REQUIRED_SECTIONS
    .filter((section) => !hasText(abstract[section]))
    .map((section) => finding({
      code: 'MISSING_ABSTRACT_SECTION',
      severity: 'warning',
      target: section,
      message: `Structured abstract is missing the ${section} section.`
    }));
}

function assessMethodsAlignment(manuscript) {
  const abstractMethods = normalize(manuscript.abstract?.methods);
  const findings = [];

  if (manuscript.methods?.sampleSize && !mentionsSampleSize(abstractMethods, manuscript.methods.sampleSize)) {
    findings.push(finding({
      code: 'SAMPLE_SIZE_MISMATCH',
      severity: 'blocker',
      target: 'methods.sampleSize',
      message: `Abstract methods do not match the method sample size of ${manuscript.methods.sampleSize}.`
    }));
  }

  const design = normalize(manuscript.methods?.design);
  if (design && (!abstractMethods.includes(design) || phraseIsNegated(abstractMethods, design))) {
    findings.push(finding({
      code: 'METHODS_DESIGN_MISMATCH',
      severity: 'blocker',
      target: 'methods.design',
      message: `Abstract methods do not describe the study design as ${manuscript.methods.design}.`
    }));
  }

  return findings;
}

function assessResultsAlignment(manuscript) {
  const results = manuscript.results || {};
  const abstractResults = normalize(manuscript.abstract?.results);
  const findings = [];

  if (results.sampleSize && !mentionsSampleSize(abstractResults, results.sampleSize)) {
    findings.push(finding({
      code: 'SAMPLE_SIZE_MISMATCH',
      severity: 'blocker',
      target: 'results.sampleSize',
      message: `Abstract results do not match the result sample size of ${results.sampleSize}.`
    }));
  }

  if (
    results.primaryEndpoint
    && (
      !abstractResults.includes(normalize(results.primaryEndpoint))
      || phraseIsNegated(abstractResults, results.primaryEndpoint)
    )
  ) {
    findings.push(finding({
      code: 'ENDPOINT_MISMATCH',
      severity: 'blocker',
      target: 'results.primaryEndpoint',
      message: `Abstract results do not name the primary endpoint: ${results.primaryEndpoint}.`
    }));
  }

  if (resultDirectionConflicts(results.direction, abstractResults)) {
    findings.push(finding({
      code: 'RESULT_DIRECTION_MISMATCH',
      severity: 'blocker',
      target: 'results.direction',
      message: `Abstract results describe a directional effect that conflicts with the result packet: ${formatDirection(results.direction)}.`
    }));
  }

  if (hasUncertainEvidence(manuscript) && overstatesResultCertainty(abstractResults)) {
    findings.push(finding({
      code: 'RESULT_OVERSTATES_EVIDENCE',
      severity: 'blocker',
      target: 'abstract.results',
      message: 'Abstract results use certainty language despite exploratory or null-crossing evidence.'
    }));
  }

  return findings;
}

function assessConclusionBalance(manuscript) {
  const findings = [];
  const conclusion = normalize(manuscript.abstract?.conclusions);
  const uncertainEvidence = hasUncertainEvidence(manuscript);

  if (uncertainEvidence && !hasLimitations(manuscript, conclusion)) {
    findings.push(finding({
      code: 'MISSING_LIMITATION_LANGUAGE',
      severity: 'blocker',
      target: 'abstract.conclusions',
      message: 'Exploratory or uncertain findings need limitation language before AI review release.'
    }));
  }

  if (uncertainEvidence && overstatesConclusion(conclusion)) {
    findings.push(finding({
      code: 'CONCLUSION_OVERSTATES_EVIDENCE',
      severity: 'blocker',
      target: 'abstract.conclusions',
      message: 'Conclusion uses definitive language despite exploratory or uncertain evidence.'
    }));
  }

  if (resultDirectionConflicts(manuscript.results?.direction, conclusion)) {
    findings.push(finding({
      code: 'CONCLUSION_RESULT_DIRECTION_MISMATCH',
      severity: 'blocker',
      target: 'abstract.conclusions',
      message: `Abstract conclusion describes a directional effect that conflicts with the result packet: ${formatDirection(manuscript.results?.direction)}.`
    }));
  }

  return findings;
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_peer_review_packet';
  if (warningCount > 0) return 'stage_for_author_revision';
  return 'release_peer_review_packet';
}

function chooseReviewLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      authorDraft: 'revise_required',
      aiPeerReview: 'blocked',
      editorSummary: 'blocked'
    };
  }
  if (warningCount > 0) {
    return {
      authorDraft: 'revision_queue',
      aiPeerReview: 'draft_only',
      editorSummary: 'withhold'
    };
  }
  return {
    authorDraft: 'allowed',
    aiPeerReview: 'allowed',
    editorSummary: 'allowed'
  };
}

function buildActions(manuscript, findings) {
  if (!findings.length) return [`release_with_abstract_consistency_monitoring:${manuscript.manuscriptId}`];

  const actions = new Set();
  const codes = new Set(findings.map((finding) => finding.code));
  if (codes.has('MALFORMED_MANUSCRIPT_PACKET')) actions.add(`repair_manuscript_packet:${manuscript.manuscriptId}`);
  if (codes.has('INVALID_ASSESSMENT_TIMESTAMP')) actions.add(`repair_assessment_timestamp:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_METHODS_EVIDENCE') || codes.has('MISSING_RESULTS_EVIDENCE')) actions.add(`attach_source_evidence:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_METHODS_ENDPOINT')) actions.add(`attach_source_evidence:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_RESULTS_ENDPOINT')) actions.add(`attach_source_evidence:${manuscript.manuscriptId}`);
  if (codes.has('SOURCE_EVIDENCE_UNSAFE')) actions.add(`replace_unsafe_source_evidence:${manuscript.manuscriptId}`);
  if (codes.has('SOURCE_ENDPOINT_MISMATCH')) actions.add(`reconcile_source_endpoints:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_ABSTRACT_SECTION')) actions.add(`add_missing_sections:${manuscript.manuscriptId}`);
  if (codes.has('METHODS_DESIGN_MISMATCH') || codes.has('SAMPLE_SIZE_MISMATCH')) actions.add(`revise_methods_summary:${manuscript.manuscriptId}`);
  if (codes.has('ENDPOINT_MISMATCH') || codes.has('RESULT_DIRECTION_MISMATCH')) actions.add(`align_results_with_primary_endpoint:${manuscript.manuscriptId}`);
  if (codes.has('RESULT_OVERSTATES_EVIDENCE')) actions.add(`revise_results_certainty:${manuscript.manuscriptId}`);
  if (codes.has('CONCLUSION_OVERSTATES_EVIDENCE') || codes.has('CONCLUSION_RESULT_DIRECTION_MISMATCH')) actions.add(`tone_down_conclusion:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_LIMITATION_LANGUAGE')) actions.add(`add_limitations_to_abstract:${manuscript.manuscriptId}`);
  return [...actions].sort();
}

function buildSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  const hasFinding = (code, targetPrefix) => findings.some(
    (finding) => finding.code === code && (!targetPrefix || finding.target.startsWith(targetPrefix))
  );
  return {
    sectionsComplete: !codes.has('MISSING_ABSTRACT_SECTION'),
    methodsAligned: !codes.has('MISSING_METHODS_EVIDENCE') && !codes.has('MISSING_METHODS_ENDPOINT') && !codes.has('SOURCE_ENDPOINT_MISMATCH') && !hasFinding('SOURCE_EVIDENCE_UNSAFE', 'methods.') && !codes.has('METHODS_DESIGN_MISMATCH') && !hasFinding('SAMPLE_SIZE_MISMATCH', 'methods.'),
    resultsAligned: !codes.has('MISSING_RESULTS_EVIDENCE') && !codes.has('MISSING_RESULTS_ENDPOINT') && !codes.has('SOURCE_ENDPOINT_MISMATCH') && !hasFinding('SOURCE_EVIDENCE_UNSAFE', 'results.') && !hasFinding('SAMPLE_SIZE_MISMATCH', 'results.') && !codes.has('ENDPOINT_MISMATCH') && !codes.has('RESULT_DIRECTION_MISMATCH') && !codes.has('RESULT_OVERSTATES_EVIDENCE') && !codes.has('CONCLUSION_RESULT_DIRECTION_MISMATCH'),
    limitationsBalanced: !codes.has('MISSING_LIMITATION_LANGUAGE') && !codes.has('CONCLUSION_OVERSTATES_EVIDENCE')
  };
}

function finding({ code, severity, target, message }) {
  return { code, severity, target, message };
}

function compareFindings(left, right) {
  return `${left.code}:${left.target}`.localeCompare(`${right.code}:${right.target}`);
}

function dedupeFindings(findings) {
  const seen = new Set();
  const deduped = [];
  for (const finding of findings) {
    const key = `${finding.code}:${finding.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(finding);
  }
  return deduped;
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isEvidenceObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

const UNSAFE_SOURCE_EVIDENCE_STATUSES = new Set([
  'concern',
  'expression of concern',
  'retracted',
  'stale',
  'superseded',
  'unsafe',
  'withdrawn'
]);

function unsafeSourceEvidenceStatusField(evidence) {
  return ['evidenceStatus', 'sourceStatus', 'citationStatus', 'retractionStatus'].find((field) =>
    Boolean(unsafeSourceEvidenceStatusLabel(evidence[field]))
  );
}

function unsafeSourceEvidenceStatusLabel(value) {
  const normalized = normalizeSourceStatus(value);
  if (!normalized) return null;
  if (UNSAFE_SOURCE_EVIDENCE_STATUSES.has(normalized)) return normalized;

  for (const status of UNSAFE_SOURCE_EVIDENCE_STATUSES) {
    if (status === 'concern') continue;
    if (normalized.includes(status)) return status;
  }

  return null;
}

function normalizeSourceStatus(value) {
  return normalize(value).replace(/[-_]+/g, ' ');
}

function phraseIsNegated(text, phrase) {
  const phrasePattern = escapeRegExp(normalize(phrase)).replace(/\\ /g, '\\s+');
  return new RegExp(`\\b(?:not|no|without)\\s+(?:a\\s+|an\\s+|the\\s+)?${phrasePattern}\\b`, 'i').test(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionsSampleSize(text, sampleSize) {
  const expected = String(sampleSize).replace(/,/g, '');
  if (!/^\d+$/.test(expected)) return text.includes(String(sampleSize));

  const comparableText = text.replace(/(\d),(?=\d)/g, '$1');
  const countPattern = new RegExp(`(^|\\D)${expected}(\\D|$)`, 'g');
  let match;
  while ((match = countPattern.exec(comparableText)) !== null) {
    const countStart = match.index + match[1].length;
    const countEnd = countStart + expected.length;
    const previousCharacter = comparableText[countStart - 1] || '';
    const nextCharacter = comparableText[countEnd] || '';
    const nextMeaningfulCharacter = comparableText.slice(countEnd).trimStart()[0] || '';
    const followingText = comparableText.slice(countEnd).trimStart();
    if (previousCharacter === '.') continue;
    if (nextMeaningfulCharacter === '%') continue;
    if (nextCharacter === '.' && /\d/.test(comparableText[countEnd + 1] || '')) continue;
    if (isMeasurementValueNotSampleSize(followingText)) continue;
    return true;
  }
  return false;
}

function isMeasurementValueNotSampleSize(followingText) {
  return /^(?:-\s*)?(?:st|nd|rd|th|milliseconds?|seconds?|secs?|s|minutes?|mins?|hours?|hrs?|h|days?|d|weeks?|wks?|months?|mos?|years?|yrs?|ms|mg|g|kg|mcg|ug|\u00b5g|ml|l|mmhg|mm|cm|m|km|iu|fold|points?|scores?|ratio|odds|hazard|confidence|ci)\b/i.test(followingText);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasValidTimestamp(value) {
  if (!hasText(value)) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value.trim());
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText = '0'] = match;
  const parts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
    millisecond: Number(millisecondText.padEnd(3, '0'))
  };
  const date = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  ));
  return (
    date.getUTCFullYear() === parts.year
    && date.getUTCMonth() + 1 === parts.month
    && date.getUTCDate() === parts.day
    && date.getUTCHours() === parts.hour
    && date.getUTCMinutes() === parts.minute
    && date.getUTCSeconds() === parts.second
    && date.getUTCMilliseconds() === parts.millisecond
  );
}

function impliesImprovement(value) {
  if (impliesNegatedBenefitClaim(value)) return false;
  return (
    /\b(improved|improvement|improves|reduced|reduction|decreased|lower|lowered|shorter|faster|better|effective|benefit)\b/i.test(value)
    || impliesPositiveSafetyClaim(value)
    || (/\b(increase|increased|increases)\b/i.test(value) && !mentionsAdverseOutcome(value))
  );
}

function impliesWorseOutcome(value) {
  return (
    /\b(worse|worsened|worsening|harm|harms|harmful|inferior|declined|negative|no clear effect|no effect|null effect|unchanged|not significant|non-significant)\b/i.test(value)
    || impliesNegatedBenefitClaim(value)
    || impliesNegativeSafetyClaim(value)
    || impliesNoDifferenceOutcome(value)
    || (/\b(increase|increased|increases)\b/i.test(value) && mentionsAdverseOutcome(value))
  );
}

function impliesNoDifferenceOutcome(value) {
  return (
    /\b(?:no|little|minimal)\s+(?:meaningful\s+|clinically\s+|statistically\s+)?differences?\b/i.test(value)
    || /\b(?:comparable|equivalent)\s+(?:outcomes?|results?|effects?|rates?|responses?)\b/i.test(value)
    || /\b(?:outcomes?|results?|effects?|rates?|responses?)\s+(?:were|was|are|remain|remained)\s+(?:comparable|equivalent)\b/i.test(value)
    || /\bno\s+superiority\b/i.test(value)
  );
}

function impliesNegatedBenefitClaim(value) {
  return /\b(did not|does not|do not|not|no|failed to|fails to|failure to)\s+(improve|improved|improves|improvement|reduce|reduced|reduction|decrease|decreased|lower|lowered|shorten|shortened|accelerate|accelerated|benefit|effective)\b/i.test(value);
}

function impliesPositiveSafetyClaim(value) {
  if (impliesNegatedSafetyConcern(value)) return true;
  if (impliesNegativeSafetyClaim(value)) return false;
  return /\b(safe|well[- ]tolerated|tolerable|promising)\b/i.test(value);
}

function impliesNegativeSafetyClaim(value) {
  if (impliesNegatedSafetyConcern(value)) return false;
  return /\b(unsafe|not safe|not well[- ]tolerated|poorly[- ]tolerated|not tolerable|safety concerns?)\b/i.test(value);
}

function impliesNegatedSafetyConcern(value) {
  const negatedSafetyPrefix = '(no|without|absence of|absent|not any)';
  const safetyQualifier = '(?:clear\\s+|new\\s+|additional\\s+|excess\\s+|serious\\s+|treatment-related\\s+|observed\\s+|increase in\\s+|increased\\s+)?';
  const safetyConcern = '(?:safety concerns?|safety signals?|adverse events?|harms?|toxicity|toxicities|complications?)';
  return new RegExp(`\\b${negatedSafetyPrefix}\\s+${safetyQualifier}${safetyConcern}\\b`, 'i').test(value);
}

function mentionsAdverseOutcome(value) {
  return /\b(adverse event|adverse events|harm|harms|mortality|death|deaths|complication|complications|toxicity|toxicities|failure|failures|error|errors|infection|infections)\b/i.test(value);
}

function resultDirectionConflicts(direction, abstractResults) {
  const normalizedDirection = normalize(direction);
  return (
    impliesImprovement(abstractResults) && isNegativeOrNoEffectDirection(normalizedDirection)
  ) || (
    impliesWorseOutcome(abstractResults) && isPositiveDirection(normalizedDirection)
  );
}

function hasUncertainEvidence(manuscript) {
  return Boolean(
    manuscript.results?.exploratory
    || manuscript.results?.confidenceIntervalCrossesNull
    || manuscript.methods?.confidenceIntervalCrossesNull
  );
}

function overstatesResultCertainty(value) {
  return /\b(statistically significant|clinically meaningful|robust|definitive|conclusive|confirmed|proven)\b/i.test(
    removeNegatedCertainty(value)
  );
}

function removeNegatedCertainty(value) {
  const certaintyPhrase = '(?:statistically\\s+significant|clinically\\s+meaningful|robust|definitive|conclusive|confirmed|proven)';
  return String(value)
    .replace(new RegExp(`\\b(?:not|no)\\s+${certaintyPhrase}(?:\\s+(?:or|and)\\s+${certaintyPhrase})*\\b`, 'gi'), ' ')
    .replace(/\bnon[- ]?significant\b/gi, ' ');
}

function isNegativeOrNoEffectDirection(direction) {
  return /\b(no_clear_effect|no clear effect|no_effect|worse|worsened|worsening|harm|harmful|inferior|declined|negative)\b/i.test(direction);
}

function isPositiveDirection(direction) {
  return /\b(improved|improvement|improves|better|benefit|beneficial|positive|effective|reduced|reduction|decreased|lower|lowered|shorter|faster)\b/i.test(direction);
}

function formatDirection(direction) {
  return normalize(direction).replace(/_/g, ' ') || 'an incompatible direction';
}

function overstatesConclusion(value) {
  return (
    overstatesResultCertainty(value)
    || /\b(definitively|proves|all|ready for clinical deployment|guarantees|always)\b/i.test(value)
  );
}

function hasLimitations(manuscript, conclusion) {
  return /\b(exploratory|limited|uncertain|pilot|retrospective|requires validation|needs validation|confidence interval|crosses null)\b/i.test(conclusion);
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessStructuredAbstract
};
