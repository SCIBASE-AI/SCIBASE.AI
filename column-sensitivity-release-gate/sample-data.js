const policy = {
  minKAnonymity: 10,
  maxSensitiveColumnsPublic: 5,
}

const datasets = [
  {
    datasetId: "metabolomics-public-release",
    title: "Metabolomics Public Release",
    releaseModes: ["public_preview", "api_access", "export_bundle"],
    releaseEvidence: {
      kAnonymity: 18,
    },
    columns: [
      { columnId: "sample_hash", label: "Sample hash", sensitivityType: "subject_id", transform: "hash" },
      { columnId: "age_band", label: "Age band", sensitivityType: "age", transform: "bucket" },
      { columnId: "site_region", label: "Site region", sensitivityType: "institution", transform: "generalize" },
      { columnId: "metabolite_a", label: "Metabolite A", sensitivityType: "lab_result" },
      { columnId: "collection_area", label: "Collection area", sensitivityType: "precise_location", transform: "coarsen_location", precisionDecimals: 2 },
    ],
    stewardApprovals: [
      approval("approval-sample", "sample_hash"),
      approval("approval-age", "age_band"),
      approval("approval-site", "site_region"),
      approval("approval-metabolite", "metabolite_a"),
      approval("approval-location", "collection_area"),
    ],
  },
  {
    datasetId: "clinical-screening-export",
    title: "Clinical Screening Export",
    releaseModes: ["public_preview", "export_bundle"],
    releaseEvidence: {
      kAnonymity: 4,
    },
    columns: [
      { columnId: "participant_email", label: "Participant email", sensitivityType: "email" },
      { columnId: "birth_date", label: "Birth date", sensitivityType: "date" },
      { columnId: "postal_code", label: "Postal code", sensitivityType: "postal_code", transform: "generalize" },
      { columnId: "diagnosis_text", label: "Diagnosis notes", sensitivityType: "free_text", redactionReview: { status: "pending" } },
      { columnId: "gps_lat_lon", label: "GPS coordinates", sensitivityType: "precise_location", transform: "coarsen_location", precisionDecimals: 5 },
      { columnId: "variant_marker", label: "Variant marker", sensitivityType: "genetic_marker" },
    ],
    stewardApprovals: [
      approval("approval-postal", "postal_code"),
    ],
  },
  {
    datasetId: "survey-free-text-review",
    title: "Survey Free Text Review",
    releaseModes: ["public_preview"],
    releaseEvidence: {
      kAnonymity: 14,
    },
    columns: [
      { columnId: "participant_hash", label: "Participant hash", sensitivityType: "subject_id", transform: "hash" },
      { columnId: "age_bucket", label: "Age bucket", sensitivityType: "age", transform: "bucket" },
      { columnId: "open_response", label: "Open response", sensitivityType: "free_text", redactionReview: { status: "pending" } },
      { columnId: "rare_condition_group", label: "Rare condition group", sensitivityType: "rare_condition", transform: "bucket" },
    ],
    stewardApprovals: [
      approval("approval-participant", "participant_hash"),
      approval("approval-age-bucket", "age_bucket"),
      approval("approval-open-response", "open_response"),
      approval("approval-rare", "rare_condition_group"),
    ],
  },
]

function approval(approvalId, columnId) {
  return {
    approvalId,
    columnId,
    role: "data_steward",
    status: "approved",
    approvedAt: "2026-05-23T22:20:00.000Z",
  }
}

module.exports = {
  policy,
  datasets,
}
