export const sampleObjects = [
  {
    id: "paper-organoid-crispr",
    type: "paper",
    domain: "computational-biology",
    institution: "Northbridge University",
    year: 2026,
    citations: 118,
    reproducibilityScore: 91,
    text:
      "Alina Chen and Mateo Ruiz at Northbridge University use CRISPR, organoids, Scanpy, Snakemake, and single-cell RNA-seq to study resistant tumor states. Dataset GSE-ORGANOID-42 and protocol PROTO-CRISPR-7 are cited with DOI 10.0000/organoid.atlas."
  },
  {
    id: "notebook-qc-thresholds",
    type: "notebook",
    domain: "computational-biology",
    institution: "Open Organoid Consortium",
    year: 2026,
    citations: 42,
    reproducibilityScore: 86,
    text:
      "The notebook reuses Dataset GSE-ORGANOID-42, Scanpy, and Snakemake to compare quality-control thresholds for single-cell RNA-seq."
  },
  {
    id: "protocol-organoid-culture",
    type: "protocol",
    domain: "wet-lab-biology",
    institution: "Northbridge University",
    year: 2025,
    citations: 64,
    reproducibilityScore: 78,
    text:
      "Protocol PROTO-CRISPR-7 describes organoid culture, CRISPR guide delivery, microscopy validation, and funder BIO-2026-114."
  }
];

export const userProfile = {
  userId: "user-alina",
  interests: ["CRISPR", "organoids", "single-cell RNA-seq", "reproducibility"],
  projectHistory: ["paper-organoid-crispr", "notebook-qc-thresholds"],
  institution: "Northbridge University"
};
