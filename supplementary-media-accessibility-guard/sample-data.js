const cleanPacket = {
  projectId: "synthetic-microscopy-atlas-v2",
  releaseDate: "2026-06-01",
  mediaArtifacts: [
    {
      id: "figure-panel-astrocyte-calcium",
      type: "figure_panel",
      checksum: "sha256:figure-panel-001",
      previewChecksum: "sha256:figure-preview-001",
      previewSourceChecksum: "sha256:figure-panel-001",
      publicPreview: true,
      accessState: "public",
      altText: "Line plot showing astrocyte calcium signal rising after stimulation and returning to baseline.",
      caption: "Figure panel summarizing calcium response traces for the synthetic astrocyte cohort.",
      thumbnail: {
        id: "thumb-figure-panel-001",
        sourceChecksum: "sha256:figure-panel-001",
        generatedAt: "2026-05-29"
      },
      accessibilityMetadata: {
        accessMode: "visual",
        accessibilityFeature: "alternativeText",
        encodingFormat: "image/png",
        schemaOrgType: "ImageObject"
      }
    },
    {
      id: "protocol-video-imaging-setup",
      type: "protocol_video",
      checksum: "sha256:protocol-video-002",
      previewChecksum: "sha256:protocol-preview-002",
      previewSourceChecksum: "sha256:protocol-video-002",
      publicPreview: true,
      accessState: "public",
      durationSeconds: 120,
      altText: "",
      caption: "Protocol video demonstrating the synthetic imaging setup and calibration sequence.",
      transcriptSegments: [
        {
          startSeconds: 0,
          endSeconds: 45,
          label: "Microscope alignment"
        },
        {
          startSeconds: 45,
          endSeconds: 92,
          label: "Stage calibration"
        },
        {
          startSeconds: 92,
          endSeconds: 120,
          label: "Acquisition settings"
        }
      ],
      thumbnail: {
        id: "thumb-video-002",
        sourceChecksum: "sha256:protocol-video-002",
        generatedAt: "2026-05-29"
      },
      accessibilityMetadata: {
        accessMode: "visual",
        accessibilityFeature: "transcript",
        encodingFormat: "video/mp4",
        schemaOrgType: "VideoObject"
      }
    }
  ]
};

const riskyPacket = {
  projectId: "synthetic-embargoed-behavior-video-v1",
  releaseDate: "2026-06-01",
  mediaArtifacts: [
    {
      id: "embargoed-protocol-video",
      type: "protocol_video",
      checksum: "sha256:protocol-video-current",
      previewChecksum: "sha256:protocol-video-preview-old",
      previewSourceChecksum: "sha256:protocol-video-previous",
      publicPreview: true,
      accessState: "restricted",
      embargoUntil: "2026-06-25",
      durationSeconds: 180,
      altText: "",
      caption: "Short clip.",
      transcriptSegments: [
        {
          startSeconds: 0,
          endSeconds: 38,
          label: "Task setup"
        },
        {
          startSeconds: 38,
          endSeconds: 75,
          label: ""
        }
      ],
      thumbnail: {
        id: "thumb-video-risky",
        sourceChecksum: "sha256:protocol-video-previous",
        generatedAt: "2026-05-01"
      },
      accessibilityMetadata: {
        accessMode: "",
        accessibilityFeature: "",
        encodingFormat: "video/mp4",
        schemaOrgType: ""
      }
    },
    {
      id: "microscopy-panel-no-alt",
      type: "microscopy_image",
      checksum: "sha256:microscopy-image-current",
      previewChecksum: "sha256:microscopy-image-preview",
      previewSourceChecksum: "sha256:microscopy-image-current",
      publicPreview: true,
      accessState: "public",
      altText: "cells",
      caption: "",
      thumbnail: {
        id: "thumb-image-risky",
        sourceChecksum: "sha256:microscopy-image-current",
        generatedAt: "2026-05-30"
      },
      accessibilityMetadata: {
        accessMode: "visual",
        accessibilityFeature: "",
        encodingFormat: "image/png",
        schemaOrgType: "ImageObject"
      }
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
