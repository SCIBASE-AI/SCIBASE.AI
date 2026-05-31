const fs = require('fs');
const path = require('path');

const LFS_POINTER_VERSION = 'https://git-lfs.github.com/spec/v1';
const SHA256_RE = /^[a-f0-9]{64}$/;

function parseLfsPointer(pointerText) {
  const errors = [];
  const fields = {};

  if (typeof pointerText !== 'string' || pointerText.trim() === '') {
    return { valid: false, errors: ['pointer-empty'], fields };
  }

  for (const rawLine of pointerText.trim().split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const [key, ...rest] = line.split(/\s+/);
    fields[key] = rest.join(' ');
  }

  if (fields.version !== LFS_POINTER_VERSION) {
    errors.push('version-invalid');
  }

  const oid = fields.oid || '';
  if (!oid.startsWith('sha256:')) {
    errors.push('oid-missing-sha256-prefix');
  }

  const sha256 = oid.startsWith('sha256:') ? oid.slice('sha256:'.length) : '';
  if (!SHA256_RE.test(sha256)) {
    errors.push('oid-invalid-sha256');
  }

  const size = Number(fields.size);
  if (!Number.isSafeInteger(size) || size < 0) {
    errors.push('size-invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
    version: fields.version || null,
    oid: sha256 || null,
    size: Number.isSafeInteger(size) ? size : null,
    fields,
  };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addFinding(findings, severity, code, filePath, message, evidence = {}) {
  findings.push({ severity, code, path: filePath, message, evidence });
}

function evaluateRepository(repository) {
  const storageByOid = new Map((repository.lfsObjects || []).map((object) => [object.oid, object]));
  const manifestByPath = new Map((repository.releaseManifest || []).map((entry) => [entry.path, entry]));
  const findings = [];
  const fileResults = [];
  const releaseDate = normalizeDate(repository.releaseDate) || new Date();
  const retentionMinimum = repository.retentionMinimumDays || 3650;

  for (const file of repository.files || []) {
    if (file.storage !== 'git-lfs') continue;

    const parsed = parseLfsPointer(file.pointer);
    const result = {
      path: file.path,
      parsed,
      manifest: manifestByPath.get(file.path) || null,
      storageObject: parsed.oid ? storageByOid.get(parsed.oid) || null : null,
      status: 'pass',
      findings: [],
    };

    if (!parsed.valid) {
      addFinding(
        result.findings,
        'blocker',
        'pointer-malformed',
        file.path,
        `Git LFS pointer is malformed: ${parsed.errors.join(', ')}`,
        { errors: parsed.errors },
      );
      result.status = 'block';
      fileResults.push(result);
      findings.push(...result.findings);
      continue;
    }

    const object = result.storageObject;
    if (!object) {
      addFinding(
        result.findings,
        'blocker',
        'lfs-object-missing',
        file.path,
        'Pointer references an object that is absent from large-object storage.',
        { oid: parsed.oid, expectedSize: parsed.size },
      );
    } else {
      if (object.sha256 !== parsed.oid) {
        addFinding(
          result.findings,
          'blocker',
          'lfs-checksum-mismatch',
          file.path,
          'Stored large-object checksum does not match the pointer object id.',
          { pointerSha256: parsed.oid, storedSha256: object.sha256 },
        );
      }

      if (object.size !== parsed.size) {
        addFinding(
          result.findings,
          'blocker',
          'lfs-size-mismatch',
          file.path,
          'Stored large-object byte size does not match the pointer size.',
          { pointerSize: parsed.size, storedSize: object.size },
        );
      }

      const expiresAt = normalizeDate(object.expiresAt);
      if (expiresAt) {
        const retentionDays = Math.floor((expiresAt.getTime() - releaseDate.getTime()) / 86400000);
        if (retentionDays < retentionMinimum) {
          addFinding(
            result.findings,
            'hold',
            'lfs-retention-too-short',
            file.path,
            'Large-object retention expires before the repository citation retention window.',
            { expiresAt: object.expiresAt, retentionDays, requiredDays: retentionMinimum },
          );
        }
      }
    }

    const manifest = result.manifest;
    if (!manifest) {
      addFinding(
        result.findings,
        'hold',
        'release-manifest-missing',
        file.path,
        'Git LFS file is not represented in the tagged release/export manifest.',
        { releaseTag: repository.releaseTag },
      );
    } else {
      if (manifest.oid !== parsed.oid) {
        addFinding(
          result.findings,
          'blocker',
          'manifest-oid-drift',
          file.path,
          'Release manifest points at a different large-object id than the Git LFS pointer.',
          { pointerSha256: parsed.oid, manifestSha256: manifest.oid },
        );
      }

      if (manifest.size !== parsed.size) {
        addFinding(
          result.findings,
          'blocker',
          'manifest-size-drift',
          file.path,
          'Release manifest byte size differs from the Git LFS pointer.',
          { pointerSize: parsed.size, manifestSize: manifest.size },
        );
      }

      if (!manifest.doiBundleIncluded) {
        addFinding(
          result.findings,
          'hold',
          'doi-export-coverage-missing',
          file.path,
          'Large object is omitted from the DOI/export bundle coverage map.',
          { releaseTag: repository.releaseTag },
        );
      }
    }

    result.status = result.findings.some((finding) => finding.severity === 'blocker')
      ? 'block'
      : result.findings.length > 0
        ? 'hold'
        : 'pass';
    fileResults.push(result);
    findings.push(...result.findings);
  }

  const uniqueObjects = new Map();
  for (const result of fileResults) {
    if (result.parsed.oid && result.storageObject) {
      uniqueObjects.set(result.parsed.oid, result.storageObject.size);
    }
  }
  const lfsUsageBytes = [...uniqueObjects.values()].reduce((total, size) => total + size, 0);
  const projectedBytes = lfsUsageBytes + (repository.pendingLfsBytes || 0);

  if (repository.lfsQuotaBytes && projectedBytes > repository.lfsQuotaBytes) {
    addFinding(
      findings,
      'hold',
      'lfs-quota-risk',
      repository.releaseTag,
      'Tagged release would exceed the configured Git LFS storage quota after pending uploads.',
      {
        currentUsage: lfsUsageBytes,
        pendingBytes: repository.pendingLfsBytes || 0,
        quotaBytes: repository.lfsQuotaBytes,
      },
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const holds = findings.filter((finding) => finding.severity === 'hold');
  const decision = blockers.length > 0 ? 'block-release' : holds.length > 0 ? 'hold-for-review' : 'allow-release';

  return {
    repository: {
      name: repository.name,
      releaseTag: repository.releaseTag,
      releaseDate: repository.releaseDate,
      lfsQuota: formatBytes(repository.lfsQuotaBytes),
      projectedLfsUsage: formatBytes(projectedBytes),
    },
    decision,
    releaseEligible: decision === 'allow-release',
    summary: {
      lfsFilesChecked: fileResults.length,
      blockers: blockers.length,
      holds: holds.length,
      passed: fileResults.filter((result) => result.status === 'pass').length,
      projectedLfsUsageBytes: projectedBytes,
      lfsQuotaBytes: repository.lfsQuotaBytes,
    },
    findings,
    fileResults: fileResults.map((result) => ({
      path: result.path,
      status: result.status,
      oid: result.parsed.oid,
      pointerSize: result.parsed.size,
      manifestCovered: Boolean(result.manifest),
      storagePresent: Boolean(result.storageObject),
      findings: result.findings,
    })),
    remediation: buildRemediation(findings),
  };
}

function buildRemediation(findings) {
  const actions = [];
  const hasCode = (code) => findings.some((finding) => finding.code === code);

  if (hasCode('pointer-malformed')) {
    actions.push('Regenerate malformed pointer files with git-lfs pointer canonical output before tagging.');
  }
  if (hasCode('lfs-object-missing')) {
    actions.push('Upload or restore missing large objects, then re-run pointer verification from a clean clone.');
  }
  if (hasCode('lfs-checksum-mismatch') || hasCode('lfs-size-mismatch')) {
    actions.push('Quarantine mismatched large objects and republish from verified source artifacts.');
  }
  if (hasCode('manifest-oid-drift') || hasCode('manifest-size-drift')) {
    actions.push('Regenerate the release/export manifest from the verified pointer set.');
  }
  if (hasCode('release-manifest-missing') || hasCode('doi-export-coverage-missing')) {
    actions.push('Add every Git LFS artifact to the DOI/export coverage map or document an explicit exclusion.');
  }
  if (hasCode('lfs-retention-too-short')) {
    actions.push('Move release artifacts to a retention tier that satisfies the citation retention window.');
  }
  if (hasCode('lfs-quota-risk')) {
    actions.push('Resolve pending large uploads, archive superseded objects, or raise quota before release.');
  }

  return actions;
}

function renderMarkdown(audit) {
  const lines = [
    `# Git LFS Pointer Integrity Guard`,
    ``,
    `Repository: ${audit.repository.name}`,
    `Release: ${audit.repository.releaseTag}`,
    `Decision: ${audit.decision}`,
    ``,
    `## Summary`,
    ``,
    `- LFS files checked: ${audit.summary.lfsFilesChecked}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Holds: ${audit.summary.holds}`,
    `- Passed: ${audit.summary.passed}`,
    `- Projected LFS usage: ${audit.repository.projectedLfsUsage} of ${audit.repository.lfsQuota}`,
    ``,
    `## Findings`,
    ``,
  ];

  if (audit.findings.length === 0) {
    lines.push(`No findings. Release can proceed.`);
  } else {
    for (const finding of audit.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code} (${finding.path}): ${finding.message}`);
    }
  }

  lines.push(``, `## Remediation`, ``);
  for (const action of audit.remediation) {
    lines.push(`- ${action}`);
  }

  lines.push(``, `## File Results`, ``);
  for (const result of audit.fileResults) {
    lines.push(
      `- ${result.status.toUpperCase()} ${result.path} (${result.storagePresent ? 'storage present' : 'storage missing'}, ${result.manifestCovered ? 'manifest covered' : 'manifest gap'})`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function renderSvg(audit) {
  const statusColor = audit.decision === 'allow-release' ? '#16a34a' : audit.decision === 'hold-for-review' ? '#ca8a04' : '#dc2626';
  const rows = audit.fileResults
    .map((result, index) => {
      const y = 178 + index * 34;
      const color = result.status === 'pass' ? '#16a34a' : result.status === 'hold' ? '#ca8a04' : '#dc2626';
      return `<text x="64" y="${y}" font-size="18" fill="#0f172a">${escapeXml(result.path)}</text><text x="742" y="${y}" font-size="18" fill="${color}" font-weight="700">${result.status.toUpperCase()}</text>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="32" y="28" width="896" height="96" rx="12" fill="#0f172a"/>
  <text x="64" y="72" font-size="30" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">Git LFS Pointer Integrity Guard</text>
  <text x="64" y="104" font-size="17" fill="#cbd5e1" font-family="Arial, sans-serif">${escapeXml(audit.repository.name)} ${escapeXml(audit.repository.releaseTag)}</text>
  <circle cx="798" cy="76" r="22" fill="${statusColor}"/>
  <text x="834" y="83" font-size="20" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">${escapeXml(audit.decision)}</text>
  <text x="64" y="154" font-size="20" fill="#334155" font-family="Arial, sans-serif">Checked ${audit.summary.lfsFilesChecked} LFS files: ${audit.summary.blockers} blockers, ${audit.summary.holds} holds, ${audit.summary.passed} pass</text>
  ${rows}
  <rect x="32" y="470" width="896" height="42" rx="8" fill="#e2e8f0"/>
  <text x="64" y="497" font-size="18" fill="#334155" font-family="Arial, sans-serif">Projected LFS usage: ${escapeXml(audit.repository.projectedLfsUsage)} of ${escapeXml(audit.repository.lfsQuota)}</text>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function writeReports(audit, outputDir = path.join(__dirname, 'reports')) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'integrity-audit.json');
  const markdownPath = path.join(outputDir, 'release-gate.md');
  const svgPath = path.join(outputDir, 'summary.svg');

  fs.writeFileSync(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(audit));
  fs.writeFileSync(svgPath, renderSvg(audit));

  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  LFS_POINTER_VERSION,
  parseLfsPointer,
  evaluateRepository,
  formatBytes,
  renderMarkdown,
  renderSvg,
  writeReports,
};
