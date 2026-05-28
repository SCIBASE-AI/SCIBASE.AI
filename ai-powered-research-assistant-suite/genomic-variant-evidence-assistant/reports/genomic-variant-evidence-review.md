# Genomic Variant Evidence Review

Study: Synthetic Neurodevelopmental Variant Manuscript
Decision: hold-pathogenicity-claim
Risk score: 100/100
Evidence digest: e98131f8bcb58383

## Scope

Variants: 2
Claims: 4
Evidence items: 5
Case-control comparisons: 1
Reference build: GRCh38
Declared transcripts: 1

## Findings

### 1. REFERENCE_BUILD_MISMATCH (high)
Variant var-syn1-p841l is not normalized to the manuscript reference build.

Recommendation: Normalize every variant to the manuscript reference build and report any liftover or remapping evidence.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "methodBuild": "GRCh38",
  "variantBuild": "GRCh37",
  "coordinate": "X:47582391C>T"
}
```

### 2. TRANSCRIPT_EVIDENCE_GAP (medium)
Variant var-syn1-p841l uses a transcript not declared in the methods.

Recommendation: State the canonical transcript and ensure HGVS claims use a transcript named in the methods.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "transcript": "NM_006950.4",
  "methodTranscripts": [
    "NM_001256799.3"
  ]
}
```

### 3. HGVS_NOMENCLATURE_GAP (medium)
Variant var-syn1-p841l has incomplete HGVS nomenclature.

Recommendation: Provide complete HGVS cDNA and protein nomenclature before the claim is reviewer-ready.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "hgvsCdna": "c.2522C>T",
  "hgvsProtein": null,
  "cdnaReady": true,
  "proteinReady": false
}
```

### 4. POPULATION_FREQUENCY_CONFLICT (high)
Variant var-syn1-p841l exceeds the rare-disease allele frequency threshold used by the manuscript.

Recommendation: Downgrade pathogenicity language or explain why population frequency is compatible with disease prevalence and penetrance.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "maxFrequency": 0.032,
  "threshold": 0.01,
  "claimIds": [
    "claim-syn1-pathogenic",
    "claim-syn1-functional",
    "claim-syn1-computational-only"
  ],
  "frequencies": {
    "gnomad": 0.018,
    "ancestryMax": 0.032,
    "localControl": 0.021
  }
}
```

### 5. CLINVAR_CONFLICT_UNRESOLVED (high)
Variant var-syn1-p841l has unresolved ClinVar evidence that conflicts with strong pathogenicity language.

Recommendation: Add an adjudication note for ClinVar benign/conflicting evidence or revise the variant classification.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "classification": "Conflicting interpretations of pathogenicity",
  "reviewStatus": "criteria provided, multiple submitters",
  "conflictingSubmissions": true,
  "claimIds": [
    "claim-syn1-pathogenic",
    "claim-syn1-functional",
    "claim-syn1-computational-only"
  ]
}
```

### 6. SEGREGATION_UNDERPOWERED (medium)
Variant var-syn1-p841l is described with family segregation support, but the pedigree evidence is underpowered.

Recommendation: Treat segregation as supportive only after reporting informative meioses, LOD support, and unaffected-carrier checks.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "lodScore": 1.2,
  "informativeMeioses": 4,
  "unaffectedCarriers": 2,
  "claimIds": [
    "claim-syn1-pathogenic"
  ]
}
```

### 7. FUNCTIONAL_ASSAY_WEAK_SUPPORT (medium)
Claim claim-syn1-functional relies on functional evidence that is not reviewer-ready.

Recommendation: Require replicated functional assays with positive and negative controls before using functional rescue language.

Evidence:
```json
{
  "claimId": "claim-syn1-functional",
  "evidenceId": "ev-functional-syn1",
  "assayType": "functional_assay",
  "positiveControl": false,
  "negativeControl": true,
  "replicates": 1,
  "validatedProtocol": false
}
```

### 8. ANCESTRY_COMPARISON_UNSUPPORTED (medium)
Comparison burden-syn1-cohort uses frequency enrichment without ancestry-matched support.

Recommendation: Match ancestry or stratify frequency comparisons before presenting case-control enrichment as variant evidence.

Evidence:
```json
{
  "comparisonId": "burden-syn1-cohort",
  "variantId": "var-syn1-p841l",
  "ancestryMatched": false,
  "stratifiedAnalysis": false,
  "cases": 42,
  "controls": 760
}
```

### 9. COMPUTATIONAL_ONLY_OVERCLAIM (medium)
Claim claim-syn1-computational-only uses strong pathogenicity language without orthogonal variant evidence.

Recommendation: Replace pathogenic or causal language with candidate-variant language until orthogonal evidence is supplied.

Evidence:
```json
{
  "claimId": "claim-syn1-computational-only",
  "variantId": "var-syn1-p841l",
  "evidenceTypes": [
    "in_silico"
  ],
  "text": "Computational prediction alone confirms this SYN1 change is a disease-causing variant."
}
```

### 10. PHENOTYPE_MATCH_WEAK (medium)
Variant var-syn1-p841l is claimed as disease-relevant with weak phenotype overlap.

Recommendation: Add HPO-level phenotype support or soften the asserted genotype-phenotype match.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "hpoOverlap": 0.38,
  "expectedThreshold": 0.5,
  "assertedPhenotype": "early infantile epileptic encephalopathy",
  "claimIds": [
    "claim-syn1-pathogenic",
    "claim-syn1-functional",
    "claim-syn1-computational-only"
  ]
}
```

### 11. REPRODUCIBILITY_EVIDENCE_GAP (high)
Variant var-syn1-p841l is missing callset reproducibility evidence.

Recommendation: Provide callset availability, validation method, pipeline version, and parameter digests for reviewer reproduction.

Evidence:
```json
{
  "variantId": "var-syn1-p841l",
  "missingOrWeakFields": [
    "vcf",
    "pipelineVersion",
    "parameterDigest",
    "validationMethod",
    "readDepthMedian"
  ],
  "vcfAvailable": false,
  "pipelineVersion": null,
  "parameterDigest": null,
  "validationMethod": null,
  "readDepthMedian": 14
}
```
