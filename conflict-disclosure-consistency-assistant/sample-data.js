export const projects = [
  {
    id: "cardio-device-trial",
    title: "Adaptive Cardio Device Trial",
    domain: "clinical trials",
    authors: [
      {
        id: "a1",
        name: "Dr. Mira Patel",
        affiliations: ["North Valley Cardiology", "PulseWave Medical"],
        disclosures: {
          funding: "NIH R01-HL-2026",
          employment: "North Valley Cardiology",
        },
      },
      {
        id: "a2",
        name: "Dr. Sol Kim",
        affiliations: ["North Valley Cardiology"],
        disclosures: {
          competingInterests: "No competing interests declared.",
          funding: "NIH R01-HL-2026",
        },
      },
    ],
    funders: [
      { name: "PulseWave Medical", role: "commercial sponsor", amountUsd: 250000 },
      { name: "NIH R01-HL-2026", role: "grant", amountUsd: 620000 },
    ],
    disclosures: {
      funding: {
        funders: ["NIH"],
        grantIds: ["R01-HL-2026"],
      },
      competingInterests: "The authors report no competing interests.",
    },
    trialRegistry: {
      id: "NCT-COI-1001",
      funders: ["PulseWave Medical", "NIH R01-HL-2026"],
    },
    datasets: [
      {
        provider: "PulseWave Medical",
        access: "restricted sponsored data room",
        terms: "sponsor approval required",
      },
    ],
    citations: [
      {
        id: "cite-pulsewave-2025",
        title: "PulseWave Pilot Study",
        authorAffiliations: ["PulseWave Medical"],
        funders: ["PulseWave Medical"],
        usedFor: "primary_support",
        context: "cited as primary efficacy support",
      },
    ],
  },
  {
    id: "open-soil-atlas",
    title: "Open Soil Microbiome Atlas",
    domain: "environmental biology",
    authors: [
      {
        id: "b1",
        name: "Dr. Ana Ruiz",
        affiliations: ["Public Field Station"],
        disclosures: {
          competingInterests: "No competing interests declared.",
          funding: "Open Earth Foundation grant OEF-42",
        },
      },
    ],
    funders: [{ name: "Open Earth Foundation grant OEF-42", role: "nonprofit grant", amountUsd: 85000 }],
    disclosures: {
      funding: {
        funders: ["Open Earth Foundation"],
        grantIds: ["OEF-42"],
      },
      competingInterests: "No competing interests declared.",
      sponsorRole: "The funder had no role in study design, analysis, or publication.",
      dataProviderRelationships: "All datasets are public under CC-BY-4.0.",
    },
    datasets: [{ provider: "Public Soil Archive", access: "public", terms: "CC-BY-4.0" }],
    citations: [],
  },
  {
    id: "materials-catalyst-screen",
    title: "Catalyst Screening With Shared Beamline Data",
    domain: "materials chemistry",
    authors: [
      {
        id: "c1",
        name: "Dr. Len Wu",
        affiliations: ["Cedar Materials Lab"],
        disclosures: {
          competingInterests: "No competing interests declared.",
          funding: "NSF DMR-77",
        },
      },
    ],
    funders: [{ name: "NSF DMR-77", role: "grant", amountUsd: 142000 }],
    disclosures: {
      funding: {
        funders: ["NSF"],
        grantIds: ["DMR-77"],
      },
      competingInterests: "No competing interests declared.",
      sponsorRole: "The funder had no role in the study.",
      dataProviderRelationships: "Beamline data were provided under standard public facility access rules.",
    },
    datasets: [{ provider: "National Beamline Facility", access: "public facility", terms: "standard access" }],
    citations: [
      {
        id: "cite-independent-2024",
        title: "Independent Catalyst Baselines",
        authorAffiliations: ["West Institute"],
        funders: ["Public Research Council"],
        usedFor: "background",
        context: "background comparison",
      },
    ],
  },
]
