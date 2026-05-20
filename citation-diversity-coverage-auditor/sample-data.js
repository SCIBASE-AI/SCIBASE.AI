"use strict";

const manuscript = {
  id: "ms-synbio-urban-health-001",
  title: "Wearable biosensor screening for urban asthma risk",
  year: 2026,
  domains: ["digital-health", "respiratory-medicine", "urban-epidemiology"],
  methods: ["wearable-sensing", "longitudinal-cohort", "bayesian-modeling"],
  populations: ["children", "urban-residents", "low-income-households"],
  claims: [
    {
      id: "C1",
      text: "Wearable particulate sensors can identify asthma-risk windows in children.",
      needs: ["respiratory-medicine", "wearable-sensing", "children"],
      purpose: "support-primary-claim"
    },
    {
      id: "C2",
      text: "Neighborhood exposure variability requires longitudinal sampling.",
      needs: ["urban-epidemiology", "longitudinal-cohort", "urban-residents"],
      purpose: "support-method"
    },
    {
      id: "C3",
      text: "Bayesian hierarchical models improve uncertainty estimates for sparse sensor streams.",
      needs: ["bayesian-modeling", "wearable-sensing"],
      purpose: "support-analysis"
    },
    {
      id: "C4",
      text: "Equitable deployment requires evidence from low-income households and open-access guidance.",
      needs: ["low-income-households", "digital-health"],
      purpose: "support-equity"
    }
  ]
};

const recommendedCitations = [
  {
    id: "R1",
    title: "Wearable Air Quality Sensors in Pediatric Asthma",
    year: 2024,
    venue: "Journal of Digital Respiratory Health",
    region: "North America",
    access: "open",
    domains: ["digital-health", "respiratory-medicine"],
    methods: ["wearable-sensing"],
    populations: ["children"],
    citedFor: ["support-primary-claim"],
    relevance: 0.93,
    influence: "recent"
  },
  {
    id: "R2",
    title: "Urban Exposure Mapping with Mobile Sensors",
    year: 2023,
    venue: "Environmental Sensing Letters",
    region: "Europe",
    access: "closed",
    domains: ["urban-epidemiology"],
    methods: ["wearable-sensing"],
    populations: ["urban-residents"],
    citedFor: ["support-method"],
    relevance: 0.84,
    influence: "recent"
  },
  {
    id: "R3",
    title: "Bayesian Models for Sparse Longitudinal Health Streams",
    year: 2022,
    venue: "Statistical Medicine Review",
    region: "North America",
    access: "open",
    domains: ["digital-health"],
    methods: ["bayesian-modeling", "longitudinal-cohort"],
    populations: ["adults"],
    citedFor: ["support-analysis"],
    relevance: 0.81,
    influence: "recent"
  },
  {
    id: "R4",
    title: "Community Sensor Programs in Asthma Prevention",
    year: 2018,
    venue: "Public Health Implementation",
    region: "North America",
    access: "closed",
    domains: ["respiratory-medicine", "urban-epidemiology"],
    methods: ["longitudinal-cohort"],
    populations: ["children", "low-income-households"],
    citedFor: ["support-equity"],
    relevance: 0.76,
    influence: "seminal"
  },
  {
    id: "R5",
    title: "Smartphone Symptom Logs for Urban Adults",
    year: 2020,
    venue: "Journal of Digital Respiratory Health",
    region: "North America",
    access: "closed",
    domains: ["digital-health"],
    methods: ["self-report-survey"],
    populations: ["adults"],
    citedFor: ["support-primary-claim"],
    relevance: 0.52,
    influence: "background"
  },
  {
    id: "R6",
    title: "Retracted Analysis of Sensor-Based Asthma Prediction",
    year: 2021,
    venue: "Journal of Digital Respiratory Health",
    region: "North America",
    access: "open",
    domains: ["digital-health", "respiratory-medicine"],
    methods: ["wearable-sensing"],
    populations: ["children"],
    citedFor: ["support-primary-claim"],
    relevance: 0.88,
    influence: "recent",
    riskFlags: ["retracted"]
  }
];

const candidatePool = [
  {
    id: "S1",
    title: "Low-Cost Air Sensors in Latin American School Networks",
    year: 2025,
    venue: "Open Environmental Health",
    region: "Latin America",
    access: "open",
    domains: ["urban-epidemiology", "respiratory-medicine"],
    methods: ["wearable-sensing", "longitudinal-cohort"],
    populations: ["children", "low-income-households"],
    citedFor: ["support-primary-claim", "support-equity"],
    relevance: 0.89,
    influence: "recent"
  },
  {
    id: "S2",
    title: "Bayesian Exposure Models for Pediatric Environmental Streams",
    year: 2024,
    venue: "Open Statistical Health Methods",
    region: "Asia-Pacific",
    access: "open",
    domains: ["digital-health", "urban-epidemiology"],
    methods: ["bayesian-modeling", "longitudinal-cohort"],
    populations: ["children", "urban-residents"],
    citedFor: ["support-analysis", "support-method"],
    relevance: 0.86,
    influence: "recent"
  },
  {
    id: "S3",
    title: "Ethical Deployment of Wearables in Low-Income Urban Clinics",
    year: 2023,
    venue: "Implementation Science Open",
    region: "Africa",
    access: "open",
    domains: ["digital-health"],
    methods: ["community-participatory-research"],
    populations: ["low-income-households", "urban-residents"],
    citedFor: ["support-equity"],
    relevance: 0.78,
    influence: "recent"
  },
  {
    id: "S4",
    title: "Foundations of Hierarchical Bayesian Disease Mapping",
    year: 2009,
    venue: "Statistical Medicine Review",
    region: "Europe",
    access: "closed",
    domains: ["urban-epidemiology"],
    methods: ["bayesian-modeling"],
    populations: ["urban-residents"],
    citedFor: ["support-analysis"],
    relevance: 0.72,
    influence: "seminal"
  }
];

module.exports = {
  manuscript,
  recommendedCitations,
  candidatePool
};
