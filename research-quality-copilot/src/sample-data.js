export const sampleProject = {
  id: "project-algae-heat-stress",
  title: "Thermal Stress Response in Coastal Algae Under Repeated Heat Pulses",
  domain: "marine biology",
  abstract:
    "We measure how repeated short heat pulses alter pigment retention, growth rate, and recovery time in coastal algae cultures.",
  audience: ["collaborators", "reviewers", "funders"],
  keywords: ["thermal stress", "coastal algae", "pigment retention", "recovery time", "marine heatwave"],
  methods: ["controlled heat pulse assay", "chlorophyll fluorescence", "mixed effects model"],
  datasets: [
    {
      id: "dataset-pulse-growth",
      title: "Algae heat pulse growth measurements",
      license: "CC-BY-4.0",
      hasPersistentId: true,
      hasRawData: true,
      hasCodebook: true
    },
    {
      id: "dataset-fluorescence",
      title: "Daily chlorophyll fluorescence readings",
      license: "CC-BY-4.0",
      hasPersistentId: false,
      hasRawData: true,
      hasCodebook: false
    }
  ],
  claims: [
    {
      id: "claim-growth",
      text: "Repeated heat pulses reduce growth rate by 18 percent over seven days.",
      evidenceIds: ["dataset-pulse-growth"],
      statistic: "mixed effects estimate -0.18, p=0.014, 95% CI [-0.29, -0.06]",
      cited: true
    },
    {
      id: "claim-recovery",
      text: "Pigment recovery is delayed after the third heat pulse.",
      evidenceIds: ["dataset-fluorescence"],
      statistic: "median recovery delay 1.7 days",
      cited: false
    },
    {
      id: "claim-transfer",
      text: "The response pattern suggests a screening assay for marine heatwave resilience.",
      evidenceIds: [],
      statistic: "",
      cited: false
    }
  ],
  manuscriptSections: [
    {
      id: "methods",
      heading: "Methods",
      wordCount: 870,
      hasDataAvailability: true,
      hasEthicsStatement: true,
      hasLimitations: false
    },
    {
      id: "results",
      heading: "Results",
      wordCount: 1120,
      hasDataAvailability: false,
      hasEthicsStatement: false,
      hasLimitations: false
    },
    {
      id: "discussion",
      heading: "Discussion",
      wordCount: 980,
      hasDataAvailability: false,
      hasEthicsStatement: false,
      hasLimitations: true
    }
  ],
  references: [
    "smith-2024-marine-heatwaves",
    "lee-2022-chlorophyll-fluorescence"
  ]
};

export const citationLibrary = [
  {
    id: "smith-2024-marine-heatwaves",
    title: "Marine Heatwaves and Coastal Primary Producers",
    authors: ["Smith, A.", "Nguyen, P."],
    year: 2024,
    venue: "Journal of Marine Ecology",
    keywords: ["marine heatwave", "coastal algae", "thermal stress"],
    methods: ["field observation", "thermal anomaly analysis"],
    doi: "10.1000/marine.2024.001"
  },
  {
    id: "lee-2022-chlorophyll-fluorescence",
    title: "Chlorophyll Fluorescence as a Stress Indicator in Macroalgae",
    authors: ["Lee, C.", "Patel, R."],
    year: 2022,
    venue: "Algal Research",
    keywords: ["chlorophyll fluorescence", "pigment retention", "macroalgae"],
    methods: ["chlorophyll fluorescence"],
    doi: "10.1000/algae.2022.014"
  },
  {
    id: "ortega-2025-heat-pulse-assays",
    title: "Short Heat Pulse Assays Predict Recovery in Intertidal Algae",
    authors: ["Ortega, M.", "Wang, J."],
    year: 2025,
    venue: "Methods in Marine Biology",
    keywords: ["heat pulse", "recovery time", "intertidal algae", "screening assay"],
    methods: ["controlled heat pulse assay", "mixed effects model"],
    doi: "10.1000/methods.2025.031"
  },
  {
    id: "haddad-2023-resilience-screening",
    title: "Screening Marine Organisms for Climate Resilience",
    authors: ["Haddad, L.", "Okafor, N."],
    year: 2023,
    venue: "Climate Biology Reviews",
    keywords: ["climate resilience", "screening assay", "thermal tolerance"],
    methods: ["meta-analysis"],
    doi: "10.1000/climate.2023.044"
  }
];
