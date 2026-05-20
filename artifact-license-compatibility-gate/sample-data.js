"use strict";

const releaseManifest = {
  releaseId: "rel-neuro-imaging-2026-05",
  releaseIntent: "public-commercial-reuse",
  targetLicense: "Apache-2.0",
  artifacts: [
    { id: "data-001", name: "curated imaging labels", type: "dataset", license: "CC-BY-4.0", attribution: "Imaging Consortium", sourceUrl: "doi:10.1000/imaging" },
    { id: "code-001", name: "segmentation pipeline", type: "code", license: "MIT", attribution: "SCIBASE Team", sourceUrl: "git:segmentation" },
    { id: "model-001", name: "baseline weights", type: "model", license: "Apache-2.0", attribution: "SCIBASE Team", sourceUrl: "s3://weights/baseline" },
    { id: "supp-001", name: "reference atlas", type: "supplement", license: "CC-BY-NC-4.0", attribution: "", sourceUrl: "doi:10.1000/atlas" },
    { id: "code-002", name: "legacy stats helper", type: "code", license: "GPL-3.0", attribution: "External Lab", sourceUrl: "git:legacy-helper" },
  ],
};

module.exports = { releaseManifest };
