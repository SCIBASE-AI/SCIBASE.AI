const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditGenomicVariantEvidence, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReadyPacket() {
  const packet = clone(samplePacket);
  packet.methods.transcripts = ["NM_006950.4", "NM_001256799.3"];
  packet.caseControlComparisons = packet.caseControlComparisons.map((comparison) => ({
    ...comparison,
    ancestryMatched: true,
    stratifiedAnalysis: true,
  }));
  const syn1 = packet.variants.find((variant) => variant.id === "var-syn1-p841l");
  syn1.genomeBuild = "GRCh38";
  syn1.hgvsProtein = "p.Pro841Leu";
  syn1.populationFrequencies = { gnomad: 0.00002, ancestryMax: 0.00005, localControl: 0 };
  syn1.clinVar = {
    classification: "Likely pathogenic",
    reviewStatus: "reviewed by expert panel",
    conflictingSubmissions: false,
    adjudicationNote: "expert-panel consensus supports likely pathogenic classification",
  };
  syn1.segregation = {
    lodScore: 3.7,
    affectedCarriers: 9,
    unaffectedCarriers: 0,
    informativeMeioses: 8,
  };
  syn1.phenotype.hpoOverlap = 0.81;
  syn1.callset = {
    vcfAvailable: true,
    pipelineVersion: "nf-core/sarek 4.1.1",
    parameterDigest: "sha256:fb12a733c1a7",
    validationMethod: "Sanger confirmation",
    readDepthMedian: 38,
  };
  const functional = packet.evidenceItems.find((item) => item.id === "ev-functional-syn1");
  functional.replicates = 4;
  functional.positiveControl = true;
  functional.negativeControl = true;
  functional.validatedProtocol = true;
  packet.claims = packet.claims.map((claim) =>
    claim.variantId === "var-syn1-p841l"
      ? {
          ...claim,
          strength: "candidate",
          text: "The SYN1 p.Pro841Leu variant is a candidate variant with orthogonal evidence that supports further genetics review.",
        }
      : claim,
  );
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

const report = auditGenomicVariantEvidence(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-pathogenicity-claim");
assert.strictEqual(report.riskScore, 100);
assert(findingCodes.has("REFERENCE_BUILD_MISMATCH"));
assert(findingCodes.has("TRANSCRIPT_EVIDENCE_GAP"));
assert(findingCodes.has("HGVS_NOMENCLATURE_GAP"));
assert(findingCodes.has("POPULATION_FREQUENCY_CONFLICT"));
assert(findingCodes.has("CLINVAR_CONFLICT_UNRESOLVED"));
assert(findingCodes.has("SEGREGATION_UNDERPOWERED"));
assert(findingCodes.has("FUNCTIONAL_ASSAY_WEAK_SUPPORT"));
assert(findingCodes.has("ANCESTRY_COMPARISON_UNSUPPORTED"));
assert(findingCodes.has("COMPUTATIONAL_ONLY_OVERCLAIM"));
assert(findingCodes.has("PHENOTYPE_MATCH_WEAK"));
assert(findingCodes.has("REPRODUCIBILITY_EVIDENCE_GAP"));

const repeatedReport = auditGenomicVariantEvidence(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditGenomicVariantEvidence(makeReadyPacket());
assert.strictEqual(readyReport.decision, "variant-evidence-ready");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.riskScore, 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "genomic-variant-evidence-assistant-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Genomic Variant Evidence Review"));

console.log("genomic-variant-evidence-assistant tests passed");
