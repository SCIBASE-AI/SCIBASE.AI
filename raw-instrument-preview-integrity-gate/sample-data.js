"use strict";

module.exports = {
  artifacts: [
    {
      id: "artifact:fcs-001",
      title: "Microglia cytokine flow panel",
      fileName: "microglia-panel.fcs",
      doi: "10.0000/scibase.fcs.001",
      expectedChecksum: "sha256:fcs-original",
      actualChecksum: "sha256:fcs-original",
      license: "CC-BY-4.0",
      previewPolicy: "safe-preview",
      creators: ["SCIBASE Flow Core"],
      publicationYear: 2026,
      expectedMetadata: {
        instrumentModel: "Cytek Aurora",
        detectorPanel: "IL6/TNF/CD11b",
        compensationMatrix: "matrix-v3",
        calibration: { laser405: 1.0, laser488: 1.0 },
        units: { FSC: "a.u.", IL6: "a.u." }
      },
      observedMetadata: {
        instrumentModel: "Cytek Aurora",
        detectorPanel: "IL6/TNF/CD11b",
        compensationMatrix: "matrix-v3",
        calibration: { laser405: 1.01, laser488: 0.99 },
        units: { FSC: "a.u.", IL6: "a.u." }
      },
      previewTransform: {
        name: "scatter-density-downsample",
        deterministic: true,
        recordsLineage: true,
        requiresRawValueExport: false,
        downsampleRatio: 0.1
      }
    },
    {
      id: "artifact:mzml-002",
      title: "Embargoed metabolomics peak run",
      fileName: "metabolomics-run.mzml",
      doi: "10.0000/scibase.mzml.002",
      expectedChecksum: "sha256:mzml-before",
      actualChecksum: "sha256:mzml-after",
      license: "restricted",
      previewPolicy: "safe-preview",
      embargoed: true,
      creators: ["SCIBASE Metabolomics Core"],
      expectedMetadata: {
        instrumentModel: "Orbitrap Eclipse",
        ionMode: "positive",
        mzRange: "50-1500",
        calibration: { mz: 1.0 },
        units: { mz: "m/z", intensity: "counts" }
      },
      observedMetadata: {
        instrumentModel: "Orbitrap Eclipse",
        ionMode: "positive",
        mzRange: "50-1500",
        calibration: { mz: 1.08 },
        units: { mz: "m/z", intensity: "relative" }
      },
      previewTransform: {
        name: "peak-topline",
        deterministic: true,
        recordsLineage: false,
        requiresRawValueExport: true,
        downsampleRatio: 0.5
      }
    },
    {
      id: "artifact:nd2-003",
      title: "Organoid microscopy stack",
      fileName: "organoid-stack.nd2",
      expectedChecksum: "sha256:nd2-stable",
      actualChecksum: "sha256:nd2-stable",
      license: "CC-BY-NC-4.0",
      previewPolicy: "safe-preview",
      creators: ["SCIBASE Imaging Core"],
      expectedMetadata: {
        instrumentModel: "Nikon AX R",
        objective: "40x",
        channelMap: ["DAPI", "GFP"],
        pixelSizeMicrons: 0.31,
        calibration: { pixelSizeMicrons: 0.31 },
        units: { x: "micron", y: "micron", intensity: "a.u." }
      },
      observedMetadata: {
        instrumentModel: "Nikon AX R",
        objective: "40x",
        channelMap: ["DAPI", "GFP"],
        pixelSizeMicrons: 0.31,
        calibration: { pixelSizeMicrons: 0.31 },
        units: { x: "micron", y: "micron", intensity: "a.u." }
      },
      previewTransform: {
        name: "thumbnail-contact-sheet",
        deterministic: true,
        recordsLineage: true,
        requiresRawValueExport: false,
        downsampleRatio: 0.05
      }
    },
    {
      id: "artifact:h5-004",
      title: "Sensor HDF5 sweep bundle",
      fileName: "sensor-sweep.h5",
      expectedChecksum: "sha256:h5-stable",
      actualChecksum: "sha256:h5-stable",
      license: "CC0-1.0",
      previewPolicy: "safe-preview",
      creators: ["SCIBASE Materials Core"],
      expectedMetadata: {
        instrumentModel: "Keysight E4990A",
        schemaVersion: "2.0",
        axisMap: { frequency: "Hz", impedance: "Ohm" },
        calibration: { impedance: 1.0 },
        units: { frequency: "Hz", impedance: "Ohm" }
      },
      observedMetadata: {
        instrumentModel: "Keysight E4990A",
        schemaVersion: "2.0",
        axisMap: { frequency: "Hz", impedance: "Ohm" },
        calibration: { impedance: 1.03 },
        units: { frequency: "Hz", impedance: "kOhm" }
      },
      previewTransform: {
        name: "dataset-tree-only",
        deterministic: true,
        recordsLineage: true,
        requiresRawValueExport: false,
        downsampleRatio: 0
      }
    }
  ]
};
