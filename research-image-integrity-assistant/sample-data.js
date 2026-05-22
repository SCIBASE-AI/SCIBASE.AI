const scenarios = [
  {
    name: 'duplicate-panel-hold',
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
  },
  {
    name: 'missing-provenance-hold',
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
  },
  {
    name: 'scale-bar-response',
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
  },
  {
    name: 'clean-image-packet',
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
  },
];

module.exports = {scenarios};
