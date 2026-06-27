export const readyExportJob = {
  id: "zenodo-export-ready",
  exportTarget: "zenodo",
  destinationType: "repository",
  requestedAt: "2026-06-26T14:00:00Z",
  embargoSensitive: false,
  ownerAcknowledgedAt: "2026-06-26T13:55:00Z",
  statusEvidence: {
    checkedAt: "2026-06-26T13:50:00Z",
    health: "operational",
    source: "synthetic-status-snapshot",
  },
  maintenanceWindows: [
    { startsAt: "2026-06-27T03:00:00Z", endsAt: "2026-06-27T05:00:00Z", reason: "scheduled index maintenance" },
  ],
  blackoutCalendar: [],
  retryPolicy: { maxDelayMinutes: 45, retryAfterMinutes: 10 },
};

export const riskyExportJob = {
  id: "funder-portal-held",
  exportTarget: "horizon-eu-portal",
  destinationType: "funder",
  requestedAt: "2026-06-26T14:20:00Z",
  embargoSensitive: true,
  ownerAcknowledgedAt: null,
  statusEvidence: {
    checkedAt: "2026-06-25T08:00:00Z",
    health: "degraded",
    source: "synthetic-status-snapshot",
  },
  maintenanceWindows: [
    { startsAt: "2026-06-26T14:00:00Z", endsAt: "2026-06-26T16:30:00Z", reason: "grant portal database failover" },
  ],
  blackoutCalendar: [
    { startsAt: "2026-06-26T12:00:00Z", endsAt: "2026-06-26T18:00:00Z", reason: "institutional grant-office freeze" },
  ],
  retryPolicy: { maxDelayMinutes: 20, retryAfterMinutes: 90 },
};
