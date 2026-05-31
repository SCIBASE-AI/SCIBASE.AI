const { LFS_POINTER_VERSION } = require('./index');

function pointer(oid, size, version = LFS_POINTER_VERSION) {
  return [`version ${version}`, `oid sha256:${oid}`, `size ${size}`].join('\n');
}

const OIDS = {
  baselineCsv: 'a'.repeat(64),
  modelWeights: 'b'.repeat(64),
  calibrationVideo: 'c'.repeat(64),
  microscopyStack: 'd'.repeat(64),
  sensorParquet: 'e'.repeat(64),
  cohortDictionary: 'f'.repeat(64),
};

const repository = {
  name: 'SCIBASE.AI reproducibility-demo',
  releaseTag: 'preprint-v2.1',
  releaseDate: '2026-05-31T00:00:00Z',
  retentionMinimumDays: 3650,
  lfsQuotaBytes: 260 * 1024 * 1024,
  pendingLfsBytes: 40 * 1024 * 1024,
  files: [
    {
      path: 'data/trial-baseline.csv',
      storage: 'git-lfs',
      pointer: pointer(OIDS.baselineCsv, 12 * 1024 * 1024),
    },
    {
      path: 'models/cell-segmentation.bin',
      storage: 'git-lfs',
      pointer: pointer(OIDS.modelWeights, 128 * 1024 * 1024),
    },
    {
      path: 'results/calibration-video.mov',
      storage: 'git-lfs',
      pointer: pointer(OIDS.calibrationVideo, 22 * 1024 * 1024),
    },
    {
      path: 'results/microscopy-stack.tif',
      storage: 'git-lfs',
      pointer: pointer(OIDS.microscopyStack, 144 * 1024 * 1024),
    },
    {
      path: 'results/highres-figure.tiff',
      storage: 'git-lfs',
      pointer: pointer('not-a-valid-sha', 'many-bytes'),
    },
    {
      path: 'data/supplementary-sensors.parquet',
      storage: 'git-lfs',
      pointer: pointer(OIDS.sensorParquet, 55 * 1024 * 1024),
    },
    {
      path: 'data/private-cohort-dictionary.xlsx',
      storage: 'git-lfs',
      pointer: pointer(OIDS.cohortDictionary, 18 * 1024 * 1024),
    },
    {
      path: 'manuscript/main.md',
      storage: 'git',
      contentSha256: '9'.repeat(64),
    },
  ],
  lfsObjects: [
    {
      oid: OIDS.baselineCsv,
      sha256: OIDS.baselineCsv,
      size: 12 * 1024 * 1024,
      storageClass: 'archive-10y',
      expiresAt: '2037-06-01T00:00:00Z',
    },
    {
      oid: OIDS.modelWeights,
      sha256: '1'.repeat(64),
      size: 128 * 1024 * 1024,
      storageClass: 'archive-10y',
      expiresAt: '2037-06-01T00:00:00Z',
    },
    {
      oid: OIDS.calibrationVideo,
      sha256: OIDS.calibrationVideo,
      size: 15 * 1024 * 1024,
      storageClass: 'archive-10y',
      expiresAt: '2037-06-01T00:00:00Z',
    },
    {
      oid: OIDS.sensorParquet,
      sha256: OIDS.sensorParquet,
      size: 55 * 1024 * 1024,
      storageClass: 'standard',
      expiresAt: '2028-01-01T00:00:00Z',
    },
    {
      oid: OIDS.cohortDictionary,
      sha256: OIDS.cohortDictionary,
      size: 18 * 1024 * 1024,
      storageClass: 'archive-10y',
      expiresAt: '2037-06-01T00:00:00Z',
    },
  ],
  releaseManifest: [
    {
      path: 'data/trial-baseline.csv',
      oid: OIDS.baselineCsv,
      size: 12 * 1024 * 1024,
      doiBundleIncluded: true,
    },
    {
      path: 'models/cell-segmentation.bin',
      oid: OIDS.modelWeights,
      size: 128 * 1024 * 1024,
      doiBundleIncluded: true,
    },
    {
      path: 'results/calibration-video.mov',
      oid: OIDS.calibrationVideo,
      size: 22 * 1024 * 1024,
      doiBundleIncluded: true,
    },
    {
      path: 'results/microscopy-stack.tif',
      oid: OIDS.microscopyStack,
      size: 144 * 1024 * 1024,
      doiBundleIncluded: true,
    },
    {
      path: 'data/private-cohort-dictionary.xlsx',
      oid: OIDS.cohortDictionary,
      size: 18 * 1024 * 1024,
      doiBundleIncluded: false,
    },
  ],
};

module.exports = { repository, OIDS, pointer };
