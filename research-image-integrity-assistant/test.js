const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateImageIntegrity,
  buildReviewerReport,
} = require('./index');

test('flags duplicated image panels across manuscript figures', () => {
  const result = evaluateImageIntegrity({
    manuscriptId: 'ms-neuron-organoid',
    generatedAt: '2026-05-22T13:00:00Z',
    figures: [
      {
        id: 'figure-1',
        panels: [
          {
            id: '1A',
            label: 'Untreated brightfield',
            rawImageId: 'raw-untreated',
            processingLogId: 'log-1A',
            perceptualHash: 'phash:001122aa',
            scaleBarPixels: 80,
            scaleBarMicrometers: 20,
          },
        ],
      },
      {
        id: 'figure-3',
        panels: [
          {
            id: '3C',
            label: 'Treated brightfield',
            rawImageId: 'raw-treated',
            processingLogId: 'log-3C',
            perceptualHash: 'phash:001122aa',
            scaleBarPixels: 80,
            scaleBarMicrometers: 20,
          },
        ],
      },
    ],
    rawImages: [
      {id: 'raw-untreated', checksum: 'sha256:raw1', pixelSizeMicrometers: 0.25, capturedAt: '2026-02-01T09:00:00Z'},
      {id: 'raw-treated', checksum: 'sha256:raw2', pixelSizeMicrometers: 0.25, capturedAt: '2026-02-01T10:00:00Z'},
    ],
    processingLogs: [
      {id: 'log-1A', operations: ['crop', 'contrast'], software: 'ImageJ 1.54'},
      {id: 'log-3C', operations: ['crop', 'contrast'], software: 'ImageJ 1.54'},
    ],
  });

  assert.equal(result.decision, 'hold-for-review');
  assert.equal(result.summary.duplicatePanelGroups, 1);
  assert.equal(result.findings[0].type, 'duplicate-panel');
  assert.deepEqual(result.findings[0].panels, ['figure-1:1A', 'figure-3:3C']);
});

test('holds reviewer packet when raw image provenance or processing logs are missing', () => {
  const result = evaluateImageIntegrity({
    manuscriptId: 'ms-missing-provenance',
    generatedAt: '2026-05-22T13:00:00Z',
    figures: [
      {
        id: 'figure-2',
        panels: [
          {
            id: '2B',
            label: 'Western blot lane composite',
            rawImageId: 'raw-missing',
            processingLogId: 'log-missing',
            perceptualHash: 'phash:778899cc',
            scaleBarPixels: 0,
            scaleBarMicrometers: 0,
          },
        ],
      },
    ],
    rawImages: [],
    processingLogs: [],
  });

  assert.equal(result.decision, 'hold-for-review');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-raw-provenance', 'missing-processing-log']
  );
  assert.equal(result.requiredActions.length, 2);
});

test('detects scale bar and pixel size metadata inconsistencies', () => {
  const result = evaluateImageIntegrity({
    manuscriptId: 'ms-scale-bar-risk',
    generatedAt: '2026-05-22T13:00:00Z',
    figures: [
      {
        id: 'figure-4',
        panels: [
          {
            id: '4D',
            label: 'Cell migration assay',
            rawImageId: 'raw-migration',
            processingLogId: 'log-4D',
            perceptualHash: 'phash:abcdef01',
            scaleBarPixels: 100,
            scaleBarMicrometers: 50,
          },
        ],
      },
    ],
    rawImages: [
      {id: 'raw-migration', checksum: 'sha256:migration', pixelSizeMicrometers: 0.25, capturedAt: '2026-03-01T12:00:00Z'},
    ],
    processingLogs: [
      {id: 'log-4D', operations: ['background subtraction'], software: 'ImageJ 1.54'},
    ],
  });

  assert.equal(result.decision, 'needs-author-response');
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].type, 'scale-bar-mismatch');
  assert.equal(result.findings[0].expectedMicrometers, 25);
  assert.equal(result.findings[0].declaredMicrometers, 50);
});

test('approves clean image packet and builds deterministic reviewer report', () => {
  const result = evaluateImageIntegrity({
    manuscriptId: 'ms-clean-image-packet',
    generatedAt: '2026-05-22T13:00:00Z',
    figures: [
      {
        id: 'figure-1',
        panels: [
          {
            id: '1A',
            label: 'Control fluorescence',
            rawImageId: 'raw-control',
            processingLogId: 'log-control',
            perceptualHash: 'phash:control',
            scaleBarPixels: 40,
            scaleBarMicrometers: 10,
          },
          {
            id: '1B',
            label: 'Treatment fluorescence',
            rawImageId: 'raw-treatment',
            processingLogId: 'log-treatment',
            perceptualHash: 'phash:treatment',
            scaleBarPixels: 40,
            scaleBarMicrometers: 10,
          },
        ],
      },
    ],
    rawImages: [
      {id: 'raw-control', checksum: 'sha256:control', pixelSizeMicrometers: 0.25, capturedAt: '2026-01-15T08:30:00Z'},
      {id: 'raw-treatment', checksum: 'sha256:treatment', pixelSizeMicrometers: 0.25, capturedAt: '2026-01-15T08:45:00Z'},
    ],
    processingLogs: [
      {id: 'log-control', operations: ['crop', 'linear contrast'], software: 'ImageJ 1.54'},
      {id: 'log-treatment', operations: ['crop', 'linear contrast'], software: 'ImageJ 1.54'},
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.findings.length, 0);
  assert.equal(result.integrityScore, 100);

  const report = buildReviewerReport(result);
  assert.match(report, /# Research Image Integrity Assistant Report/);
  assert.match(report, /Manuscript: ms-clean-image-packet/);
  assert.match(report, /Decision: approved/);
  assert.match(report, /Integrity score: 100/);
  assert.match(report, /Findings: 0/);
});
