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
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function normalizeChecksum(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasConsent(author) {
  return Boolean(author && author.attributionConsent === true && author.orcid);
}

function findArtifact(bundle, type) {
  return (bundle.artifacts || []).find((artifact) => artifact.type === type);
}

function evaluateProjectAuthoringBundle(bundle) {
  const findings = [];
  const artifactMap = byId(bundle.artifacts);
  const authorsById = byId(bundle.authors);
  const decisionById = byId(bundle.discussionDecisions);
  const manuscript = findArtifact(bundle, 'manuscript');
  const manifest = bundle.reproducibilityManifest;

  if (!manuscript) {
    addFinding(findings, 'high', 'missing_manuscript', 'Workspace has no primary manuscript artifact.');
  }

  if (!manifest) {
    addFinding(findings, 'high', 'missing_reproducibility_manifest', 'Workspace has no reproducibility manifest for reviewer handoff.');
  } else {
    validateNotebookFreshness(bundle, manifest, artifactMap, findings);
    if (!manifest.environmentPinned) {
      addFinding(findings, 'medium', 'environment_not_pinned', 'Reproducibility manifest does not pin the execution environment.');
    }
  }

  for (const artifact of bundle.artifacts || []) {
    if (!normalizeChecksum(artifact.checksum)) {
      addFinding(findings, 'high', 'artifact_missing_checksum', `${artifact.path} is missing a stable checksum.`, {
        artifactId: artifact.id,
        type: artifact.type
      });
    }
    if (['manuscript', 'notebook', 'code'].includes(artifact.type) && !normalizeChecksum(artifact.sourceChecksum)) {
      addFinding(findings, 'medium', 'artifact_missing_source_checksum', `${artifact.path} is missing source provenance checksum.`, {
        artifactId: artifact.id,
        type: artifact.type
      });
    }
  }

  validateCitationMetadata(bundle, authorsById, findings);
  validateRestrictedReferences(bundle, artifactMap, findings);
  validateDiscussionSignoffs(bundle, decisionById, findings);

  const high = findings.filter((finding) => finding.severity === 'high').length;
  const medium = findings.filter((finding) => finding.severity === 'medium').length;
  const low = findings.filter((finding) => finding.severity === 'low').length;
  const decision = high > 0 ? 'hold' : medium > 0 ? 'review' : 'allow';

  return {
    projectId: bundle.project.id,
    title: bundle.project.title,
    decision,
    summary: { high, medium, low, total: findings.length },
    findings,
    requirementMap: {
      projectSpaces: 'documents, code, datasets, discussion decisions, metadata, and citations are represented as artifacts',
      authoring: 'Markdown/LaTeX/Jupyter-native provenance is checked with source checksums and notebook execution manifests',
      attribution: 'ORCID-ready collaborator attribution and funding/institution metadata are validated',
      accessControl: 'restricted dataset references are blocked from accidental public manuscript release',
      auditLog: 'decision, artifact, and manifest digests create reviewer-ready audit evidence'
    },
    auditDigest: digest({
      project: bundle.project,
      artifacts: bundle.artifacts,
      citationMetadata: bundle.citationMetadata,
      findings
    })
  };
}

function validateNotebookFreshness(bundle, manifest, artifactMap, findings) {
  for (const notebook of manifest.notebooks || []) {
    const artifact = artifactMap.get(notebook.id);
    if (!artifact) {
      addFinding(findings, 'high', 'manifest_notebook_missing', `Manifest references missing notebook ${notebook.id}.`, {
        notebookId: notebook.id
      });
      continue;
    }

    for (const codeRef of notebook.executedAgainst?.code || []) {
      const codeArtifact = artifactMap.get(codeRef.artifactId);
      if (!codeArtifact || normalizeChecksum(codeArtifact.checksum) !== normalizeChecksum(codeRef.checksum)) {
        addFinding(findings, 'high', 'stale_notebook_code', `${artifact.path} was not executed against the current code artifact.`, {
          notebookId: notebook.id,
          codeArtifactId: codeRef.artifactId,
          expected: codeArtifact?.checksum || null,
          recorded: codeRef.checksum
        });
      }
    }

    for (const dataRef of notebook.executedAgainst?.datasets || []) {
      const dataArtifact = artifactMap.get(dataRef.artifactId);
      if (!dataArtifact || normalizeChecksum(dataArtifact.checksum) !== normalizeChecksum(dataRef.checksum)) {
        addFinding(findings, 'high', 'stale_notebook_dataset', `${artifact.path} was not executed against the current dataset checksum.`, {
          notebookId: notebook.id,
          datasetArtifactId: dataRef.artifactId,
          expected: dataArtifact?.checksum || null,
          recorded: dataRef.checksum
        });
      }
    }
  }
}

function validateCitationMetadata(bundle, authorsById, findings) {
  const metadata = bundle.citationMetadata || {};
  if (!metadata.doi && bundle.project.publicationTarget === 'public') {
    addFinding(findings, 'medium', 'missing_doi', 'Public publication target is missing DOI or pre-registration identifier.');
  }
  if (!metadata.license) {
    addFinding(findings, 'medium', 'missing_license', 'Citation metadata is missing a license.');
  }
  if (!Array.isArray(metadata.fundingSources) || metadata.fundingSources.length === 0) {
    addFinding(findings, 'medium', 'missing_funding_sources', 'Project citation metadata has no funding source acknowledgement.');
  }
  if (!Array.isArray(metadata.institutions) || metadata.institutions.length === 0) {
    addFinding(findings, 'medium', 'missing_institutions', 'Project citation metadata has no institution attribution.');
  }

  for (const contributorId of metadata.contributors || []) {
    const author = authorsById.get(contributorId);
    if (!author) {
      addFinding(findings, 'high', 'citation_unknown_contributor', `Citation metadata references unknown contributor ${contributorId}.`, {
        contributorId
      });
      continue;
    }
    if (!hasConsent(author)) {
      addFinding(findings, 'high', 'citation_contributor_not_attribution_ready', `${author.name} lacks ORCID-backed attribution consent.`, {
        contributorId,
        orcid: author.orcid || null,
        attributionConsent: author.attributionConsent
      });
    }
  }
}

function validateRestrictedReferences(bundle, artifactMap, findings) {
  const publicRelease = bundle.project.publicationTarget === 'public';
  for (const artifact of bundle.artifacts || []) {
    if (artifact.type !== 'manuscript') continue;
    for (const reference of artifact.references || []) {
      const target = artifactMap.get(reference.artifactId);
      if (!target) {
        addFinding(findings, 'high', 'manuscript_reference_missing', `${artifact.path} references missing artifact ${reference.artifactId}.`, {
          manuscriptId: artifact.id,
          artifactId: reference.artifactId
        });
        continue;
      }
      if (publicRelease && target.restricted === true && reference.publicDisclosureNote !== true) {
        addFinding(findings, 'high', 'restricted_dataset_public_reference', `${artifact.path} references restricted data without a public disclosure note.`, {
          manuscriptId: artifact.id,
          artifactId: target.id,
          path: target.path
        });
      }
    }
  }
}

function validateDiscussionSignoffs(bundle, decisionById, findings) {
  for (const artifact of bundle.artifacts || []) {
    if (!['manuscript', 'notebook'].includes(artifact.type)) continue;
    for (const decisionId of artifact.requiredDecisionIds || []) {
      const decision = decisionById.get(decisionId);
      if (!decision) {
        addFinding(findings, 'medium', 'missing_discussion_decision', `${artifact.path} references missing discussion decision ${decisionId}.`, {
          artifactId: artifact.id,
          decisionId
        });
        continue;
      }
      const missing = (decision.requiredSignoffs || []).filter((signoff) => !(decision.signoffs || []).includes(signoff));
      if (missing.length > 0) {
        addFinding(findings, 'medium', 'discussion_signoff_missing', `${artifact.path} is waiting on discussion signoff evidence.`, {
          artifactId: artifact.id,
          decisionId,
          missing
        });
      }
    }
  }
}

function evaluateBundles(bundles) {
  const reviews = bundles.map(evaluateProjectAuthoringBundle);
  return {
    generatedAt: new Date().toISOString(),
    overallDecision: reviews.some((review) => review.decision === 'hold')
      ? 'hold'
      : reviews.some((review) => review.decision === 'review')
        ? 'review'
        : 'allow',
    reviews,
    packetDigest: digest(reviews)
  };
}

function formatMarkdown(packet) {
  const lines = [
    '# Project Authoring Integrity Review',
    '',
    `Generated: ${packet.generatedAt}`,
    `Overall decision: **${packet.overallDecision.toUpperCase()}**`,
    `Packet digest: \`${packet.packetDigest}\``,
    ''
  ];

  for (const review of packet.reviews) {
    lines.push(`## ${review.title}`);
    lines.push('');
    lines.push(`Decision: **${review.decision.toUpperCase()}**`);
    lines.push(`Audit digest: \`${review.auditDigest}\``);
    lines.push(`Findings: ${review.summary.total} (${review.summary.high} high, ${review.summary.medium} medium, ${review.summary.low} low)`);
    lines.push('');
    if (review.findings.length === 0) {
      lines.push('- No authoring integrity findings.');
    } else {
      for (const finding of review.findings) {
        lines.push(`- **${finding.severity.toUpperCase()}** \`${finding.code}\`: ${finding.message}`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function formatSvg(packet) {
  const rows = packet.reviews.map((review, index) => {
    const y = 132 + index * 58;
    const color = review.decision === 'hold' ? '#ef4444' : review.decision === 'review' ? '#f59e0b' : '#22c55e';
    return [
      `<rect x="40" y="${y - 30}" width="880" height="44" rx="8" fill="#1e293b"/>`,
      `<circle cx="68" cy="${y - 8}" r="8" fill="${color}"/>`,
      `<text x="92" y="${y - 12}" fill="#f8fafc" font-size="16">${escapeXml(review.title)}</text>`,
      `<text x="92" y="${y + 8}" fill="#cbd5e1" font-size="13">${review.decision.toUpperCase()} - ${review.summary.high} high / ${review.summary.medium} medium / digest ${review.auditDigest}</text>`
    ].join('');
  });

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="360" viewBox="0 0 960 360">',
    '<rect width="960" height="360" fill="#0f172a"/>',
    '<text x="40" y="58" fill="#f8fafc" font-size="30" font-family="Arial, sans-serif">SCIBASE Project Authoring Integrity Guard</text>',
    `<text x="40" y="90" fill="#cbd5e1" font-size="16" font-family="Arial, sans-serif">Overall ${packet.overallDecision.toUpperCase()} - packet ${packet.packetDigest}</text>`,
    `<g font-family="Arial, sans-serif">${rows.join('')}</g>`,
    '</svg>'
  ].join('');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  digest,
  evaluateProjectAuthoringBundle,
  evaluateBundles,
  formatMarkdown,
  formatSvg,
  stableStringify
};
