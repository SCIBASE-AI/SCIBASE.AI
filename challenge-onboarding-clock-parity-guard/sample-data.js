"use strict";

const cleanPacket = {
  challenge: {
    id: "challenge-clean-18",
    title: "Protein design bounty onboarding",
    sponsor: "SCIBASE synthetic sponsor"
  },
  onboarding: {
    templateVersion: "workspace-template-2026.06",
    starterKitChecksum: "sha256:starter-clean-abc123",
    requiredTools: ["notebook-runtime", "dataset-preview", "benchmark-runner"],
    requiredSupportChannels: ["announcements", "setup-help", "clarifications"],
    minimumQuota: {
      cpuHours: 40,
      gpuHours: 8,
      storageGb: 25
    }
  },
  submissionClock: {
    startsAt: "2026-06-03T16:00:00.000Z",
    postReadyBufferMinutes: 30,
    maxReadySkewMinutes: 45,
    durationHours: 168
  },
  acceptedTeams: [
    {
      id: "team-alpha",
      acceptedAt: "2026-06-03T12:00:00.000Z",
      workspace: {
        provisionedAt: "2026-06-03T12:12:00.000Z",
        readyAt: "2026-06-03T14:05:00.000Z",
        templateVersion: "workspace-template-2026.06",
        starterKitChecksum: "sha256:starter-clean-abc123",
        tools: ["notebook-runtime", "dataset-preview", "benchmark-runner"],
        computeQuota: {
          cpuHours: 42,
          gpuHours: 8,
          storageGb: 25
        }
      },
      support: {
        channels: ["announcements", "setup-help", "clarifications"],
        firstResponseAt: "2026-06-03T14:12:00.000Z"
      },
      setupBlockerOpen: false
    },
    {
      id: "team-beta",
      acceptedAt: "2026-06-03T12:00:00.000Z",
      workspace: {
        provisionedAt: "2026-06-03T12:14:00.000Z",
        readyAt: "2026-06-03T14:28:00.000Z",
        templateVersion: "workspace-template-2026.06",
        starterKitChecksum: "sha256:starter-clean-abc123",
        tools: ["notebook-runtime", "dataset-preview", "benchmark-runner"],
        computeQuota: {
          cpuHours: 42,
          gpuHours: 8,
          storageGb: 25
        }
      },
      support: {
        channels: ["announcements", "setup-help", "clarifications"],
        firstResponseAt: "2026-06-03T14:20:00.000Z"
      },
      setupBlockerOpen: false
    }
  ]
};

const riskyPacket = {
  challenge: {
    id: "challenge-risky-18",
    title: "Wet-lab modeling bounty onboarding",
    sponsor: "SCIBASE synthetic sponsor"
  },
  onboarding: {
    templateVersion: "workspace-template-2026.06",
    starterKitChecksum: "sha256:starter-clean-abc123",
    requiredTools: ["notebook-runtime", "dataset-preview", "benchmark-runner"],
    requiredSupportChannels: ["announcements", "setup-help", "clarifications"],
    minimumQuota: {
      cpuHours: 40,
      gpuHours: 8,
      storageGb: 25
    }
  },
  submissionClock: {
    startsAt: "2026-06-03T15:00:00.000Z",
    postReadyBufferMinutes: 30,
    maxReadySkewMinutes: 45,
    durationHours: 168
  },
  acceptedTeams: [
    {
      id: "team-alpha",
      acceptedAt: "2026-06-03T12:00:00.000Z",
      workspace: {
        provisionedAt: "2026-06-03T12:10:00.000Z",
        readyAt: "2026-06-03T14:00:00.000Z",
        templateVersion: "workspace-template-2026.06",
        starterKitChecksum: "sha256:starter-clean-abc123",
        tools: ["notebook-runtime", "dataset-preview", "benchmark-runner", "private-gpu-pool"],
        extraToolsApproved: false,
        computeQuota: {
          cpuHours: 40,
          gpuHours: 12,
          storageGb: 25
        }
      },
      support: {
        channels: ["announcements", "setup-help", "clarifications"],
        firstResponseAt: "2026-06-03T14:02:00.000Z"
      },
      setupBlockerOpen: false
    },
    {
      id: "team-beta",
      acceptedAt: "2026-06-03T12:00:00.000Z",
      workspace: {
        provisionedAt: "2026-06-03T12:35:00.000Z",
        readyAt: "2026-06-03T15:35:00.000Z",
        templateVersion: "workspace-template-2026.05",
        starterKitChecksum: "sha256:old-starter-kit",
        tools: ["notebook-runtime", "dataset-preview"],
        computeQuota: {
          cpuHours: 28,
          gpuHours: 4,
          storageGb: 20
        }
      },
      support: {
        channels: ["announcements", "setup-help"],
        firstResponseAt: "2026-06-03T15:20:00.000Z"
      },
      setupBlockerOpen: true
    },
    {
      id: "team-gamma",
      acceptedAt: "2026-06-03T12:00:00.000Z",
      workspace: {
        provisionedAt: "2026-06-03T13:05:00.000Z",
        readyAt: null,
        templateVersion: "workspace-template-2026.06",
        starterKitChecksum: "sha256:starter-clean-abc123",
        tools: ["notebook-runtime", "dataset-preview", "benchmark-runner"],
        computeQuota: {
          cpuHours: 40,
          gpuHours: 8,
          storageGb: 25
        }
      },
      support: {
        channels: ["announcements", "setup-help", "clarifications"],
        firstResponseAt: null
      },
      setupBlockerOpen: true
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
