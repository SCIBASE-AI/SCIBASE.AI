export const samplePaper = {
  id: "paper-neuro-oxide-2026",
  title: "Open Materials for Low-Temperature Oxide Neuromorphic Arrays",
  doi: "10.5555/scibase.oxide.2026",
  authors: [
    { given: "Mira", family: "Shah", affiliation: "Northbridge Institute" },
    { given: "Leo", family: "Kim", affiliation: "Cedar Quantum Lab" },
    { given: "Ana", family: "Santos", affiliation: "Open Devices Consortium" }
  ],
  venue: "Journal of Reproducible Materials Systems",
  year: 2026,
  abstract:
    "We report a low-temperature oxide process for neuromorphic memory arrays and release masked layouts, measurement scripts, and raw switching traces. The process reduces annealing temperature while preserving endurance in small prototype arrays.",
  sections: [
    {
      heading: "Introduction",
      text:
        "Neuromorphic oxide arrays remain difficult to reproduce because process windows, scripts, and failed runs are often omitted from publications."
    },
    {
      heading: "Methods",
      text:
        "Devices were fabricated below 350 C using an open sputtering recipe. We measured 128-cell arrays across five wafers, pinned the Python analysis environment, and released raw traces with calibration metadata."
    },
    {
      heading: "Results",
      text:
        "Median switching energy fell by 18 percent compared with the high-temperature baseline. Endurance exceeded 1e5 cycles for 91 percent of cells, while edge cells showed higher drift."
    },
    {
      heading: "Limitations",
      text:
        "The prototype uses a small wafer count and does not yet include long-term humidity stress testing. Claims should be validated by independent fabs."
    }
  ],
  references: [
    { title: "Reproducible oxide memory benchmarks", doi: "10.1000/oxide.bench.2024" },
    { title: "Open process metadata for device research", doi: "10.1000/process.meta.2025" },
    { title: "Neuromorphic array endurance statistics", doi: "10.1000/array.stats.2025" }
  ],
  artifacts: [
    { name: "raw_switching_traces.csv", type: "dataset", checksum: "sha256:4df7", rows: 128000 },
    { name: "analysis_environment.lock", type: "environment", checksum: "sha256:91aa" },
    { name: "masked_layouts.gds", type: "layout", checksum: "sha256:cc20" }
  ],
  claims: [
    { id: "c1", text: "The process reduces switching energy by 18 percent.", evidence: ["Results"], citations: 2 },
    { id: "c2", text: "The data package supports independent reproduction.", evidence: ["Methods", "Artifacts"], citations: 3 },
    { id: "c3", text: "The method is production ready.", evidence: [], citations: 0 }
  ]
};

export const researcherProfile = {
  id: "reviewer-materials-ops",
  name: "Materials Reproducibility Reviewer",
  interests: ["oxide devices", "open data", "fabrication workflows"],
  preferredStyles: ["apa", "bibtex"],
  reviewStrictness: "high"
};
