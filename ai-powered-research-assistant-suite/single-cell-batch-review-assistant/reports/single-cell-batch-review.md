# Single-Cell Batch Review

Study: Synthetic Single-Cell Neuroinflammation Manuscript
Decision: hold-cell-state-claims
Risk score: 100/100
Evidence digest: a85d2437a6518a4e

## Scope

Samples: 3
Cells: 10600
Claims: 2
Evidence items: 3
Cell-type annotations: 2
Cluster checks: 2

## Findings

### 1. BATCH_CONFOUNDED_DESIGN (high)
Batch library-chemistry is strongly confounded with biological condition.

Recommendation: Balance condition across batches or add a limitation and batch-aware sensitivity analysis.

Evidence:
```json
{
  "batchId": "library-chemistry",
  "variable": "10x chemistry and run day",
  "conditionCounts": {
    "control": 1,
    "disease": 2
  },
  "maxShare": 0.6666666666666666,
  "conditionAssociation": 0.91,
  "affectedSamples": [
    "ctrl-01",
    "case-01",
    "case-02"
  ]
}
```

### 2. BATCH_CONFOUNDED_DESIGN (high)
Batch sequencing-lane is strongly confounded with biological condition.

Recommendation: Balance condition across batches or add a limitation and batch-aware sensitivity analysis.

Evidence:
```json
{
  "batchId": "sequencing-lane",
  "variable": "lane",
  "conditionCounts": {
    "control": 0,
    "disease": 2
  },
  "maxShare": 1,
  "conditionAssociation": 1,
  "affectedSamples": [
    "case-01",
    "case-02"
  ]
}
```

### 3. DONOR_REPLICATION_GAP (high)
Differential expression is not supported by donor-level replication.

Recommendation: Use donor-level replication or pseudobulk models before claiming group-level biology.

Evidence:
```json
{
  "donorsByCondition": {
    "control": 1,
    "disease": 2
  },
  "minDonors": 1,
  "deModel": "cell_level_wilcoxon",
  "usesPseudobulk": false,
  "randomEffect": null
}
```

### 4. DOUBLET_BURDEN_UNRESOLVED (medium)
Sample ctrl-01 has unresolved doublet risk.

Recommendation: Run doublet detection and report removal thresholds before interpreting rare clusters.

Evidence:
```json
{
  "sampleId": "ctrl-01",
  "condition": "control",
  "doubletDetectionRun": false,
  "doubletRate": 0.12,
  "cells": 2600
}
```

### 5. DOUBLET_BURDEN_UNRESOLVED (medium)
Sample case-01 has unresolved doublet risk.

Recommendation: Run doublet detection and report removal thresholds before interpreting rare clusters.

Evidence:
```json
{
  "sampleId": "case-01",
  "condition": "disease",
  "doubletDetectionRun": true,
  "doubletRate": 0.11,
  "cells": 4100
}
```

### 6. CELL_TYPE_MARKER_WEAK (medium)
Cell type label novel inflammatory microglia has weak marker support.

Recommendation: Support annotations with canonical markers, negative markers, and ambiguity notes.

Evidence:
```json
{
  "clusterId": "c7",
  "label": "novel inflammatory microglia",
  "positiveMarkerSupport": 0.46,
  "negativeMarkerSupport": 0.32,
  "ambiguousLabel": true,
  "topMarkers": [
    "C1QA",
    "LYZ",
    "MALAT1"
  ]
}
```

### 7. INTEGRATION_OVERCORRECTION_RISK (medium)
Integrated expression is used for differential expression without condition-preservation support.

Recommendation: Avoid testing differential expression on over-integrated expression values without condition-preservation diagnostics.

Evidence:
```json
{
  "method": "Harmony",
  "expressionUsedForDE": true,
  "conditionPreservationDiagnostic": false,
  "silhouetteDelta": -0.34
}
```

### 8. QC_THRESHOLD_GAP (medium)
Single-cell QC thresholds are incomplete.

Recommendation: Report mitochondrial, ribosomal, UMI, gene-count, and minimum-cell filters for every sample.

Evidence:
```json
{
  "missingFields": [
    "ribosomalMax",
    "maxGenes",
    "minUmi",
    "minCellsPerSample"
  ],
  "suppliedFields": [
    "minGenes",
    "mitochondrialMax"
  ]
}
```

### 9. AMBIENT_RNA_UNCORRECTED (medium)
Ambient RNA contamination is above threshold without correction evidence.

Recommendation: Correct or quantify ambient RNA contamination before assigning marker-driven clusters.

Evidence:
```json
{
  "estimatedContamination": 0.14,
  "correctionRun": false,
  "affectedMarkers": [
    "C1QA",
    "LYZ",
    "MALAT1"
  ]
}
```

### 10. CLUSTER_STABILITY_GAP (medium)
Highlighted cluster c7 is not stable across checks.

Recommendation: Add resolution sensitivity, bootstrap, or cross-donor stability checks for highlighted clusters.

Evidence:
```json
{
  "clusterId": "c7",
  "label": "novel inflammatory microglia",
  "bootstrapJaccard": 0.41,
  "resolutionConsistency": 0.48
}
```

### 11. DE_OVERCLAIM_UNSUPPORTED (high)
Claim claim-c7-disease-driver overstates differential expression evidence.

Recommendation: Downgrade differential-expression claims until donor-replicated models, FDR control, and effect sizes agree.

Evidence:
```json
{
  "claimId": "claim-c7-disease-driver",
  "text": "A novel inflammatory microglia state drives disease and is differentially expressed in the patient condition.",
  "evidenceTypes": [
    "cell_level_de",
    "marker_panel"
  ],
  "usesPseudobulk": false,
  "deModel": "cell_level_wilcoxon",
  "hasDonorModel": false
}
```

### 12. REPRODUCIBILITY_EVIDENCE_GAP (high)
Single-cell analysis reproducibility evidence is incomplete.

Recommendation: Provide raw matrix accessions, analysis code, random seeds, package versions, and parameter digests.

Evidence:
```json
{
  "missingFields": [
    "rawMatrixAccession",
    "analysisCodeAvailable",
    "pipelineVersion",
    "randomSeed",
    "parameterDigest",
    "packageLockDigest"
  ],
  "rawMatrixAccession": null,
  "pipelineVersion": null,
  "randomSeed": null
}
```
