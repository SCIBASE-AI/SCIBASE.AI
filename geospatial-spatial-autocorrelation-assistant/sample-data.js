"use strict";

const riskyPacket = {
  id: "geo-review-risky-2026-06",
  policy: {
    minSpatialHoldoutKm: 35,
    highMoransI: 0.35,
    maxSensitivePrecisionDecimals: 4,
    minRegionsForBroadClaims: 3,
    maxCovariateWindowDays: 365
  },
  manuscripts: [
    {
      id: "urban-heat-random-split",
      title: "Continental urban heat risk from neighborhood satellite features",
      field: "environmental epidemiology",
      sensitivity: "human-subjects",
      spatialDesign: {
        crs: "",
        projection: "web map tiles",
        coordinatePrecisionDecimals: 6,
        samplingFrame: "three volunteer neighborhoods"
      },
      claims: [
        {
          id: "claim-generalization",
          scope: "continental",
          claimedRegions: ["Northeast", "Midwest", "South", "West"],
          text: "The model generalizes across continental urban heat islands."
        }
      ],
      samples: [
        { id: "s-001", lat: 40.712776, lon: -74.005974, split: "train", region: "Northeast", site: "NYC-A" },
        { id: "s-002", lat: 40.734112, lon: -73.98742, split: "test", region: "Northeast", site: "NYC-B" },
        { id: "s-003", lat: 40.75891, lon: -73.98513, split: "train", region: "Northeast", site: "NYC-C" },
        { id: "s-004", lat: 40.76172, lon: -73.97864, split: "test", region: "Northeast", site: "NYC-D" }
      ],
      models: [
        {
          id: "rf-heat-risk",
          splitStrategy: "random",
          moransI: 0.62,
          preprocessingFitScope: "full_dataset",
          hyperparameterTunedOn: "test",
          deploymentContext: "national heat-risk triage",
          spatialCovariates: true,
          externalValidationSites: [],
          covariates: [
            { name: "NDVI", source: "", resolutionMeters: 1000, acquisitionWindowDays: 540 },
            { name: "impervious_surface", source: "city-open-data:impervious-v1", resolutionMeters: 30, acquisitionWindowDays: 90 }
          ]
        }
      ],
      reproducibilityArtifacts: {
        dataManifest: "",
        codeCommit: "2f7c91e",
        environmentSpec: "",
        spatialBlockMap: ""
      }
    }
  ]
};

const cleanPacket = {
  id: "geo-review-clean-2026-06",
  policy: riskyPacket.policy,
  manuscripts: [
    {
      id: "rangeland-blocked-validation",
      title: "Regional rangeland recovery forecasts with blocked spatial validation",
      field: "ecology",
      sensitivity: "public-environmental",
      spatialDesign: {
        crs: "EPSG:4326 WGS84 source coordinates; EPSG:5070 equal-area analysis projection",
        projection: "EPSG:5070",
        coordinatePrecisionDecimals: 3,
        samplingFrame: "blocked stratified ecological sites"
      },
      claims: [
        {
          id: "claim-regional",
          scope: "regional",
          claimedRegions: ["Colorado Front Range", "New Mexico Plateau", "Utah Basin"],
          text: "The blocked model supports regional recovery forecasts for sampled western rangeland systems."
        }
      ],
      samples: [
        { id: "co-001", lat: 39.739, lon: -104.99, split: "train", region: "Colorado Front Range", site: "CO-A" },
        { id: "co-002", lat: 39.231, lon: -105.02, split: "train", region: "Colorado Front Range", site: "CO-B" },
        { id: "nm-001", lat: 35.084, lon: -106.65, split: "test", region: "New Mexico Plateau", site: "NM-A" },
        { id: "ut-001", lat: 40.760, lon: -111.89, split: "test", region: "Utah Basin", site: "UT-A" }
      ],
      models: [
        {
          id: "blocked-gbm-recovery",
          splitStrategy: "spatial_block_leave_region_out",
          moransI: 0.18,
          preprocessingFitScope: "training_fold",
          hyperparameterTunedOn: "inner_validation",
          deploymentContext: "",
          spatialCovariates: true,
          externalValidationSites: ["New Mexico Plateau", "Utah Basin"],
          covariates: [
            { name: "soil_moisture", source: "doi:10.1234/soil-moisture-v3", resolutionMeters: 250, acquisitionWindowDays: 30 },
            { name: "burn_severity", source: "artifact:burn-severity-2026-05", resolutionMeters: 30, acquisitionWindowDays: 12 }
          ]
        }
      ],
      reproducibilityArtifacts: {
        dataManifest: "artifact:geo-sample-manifest-v2",
        codeCommit: "d6b0e3c",
        environmentSpec: "container:ghcr.io/scibase/geo-review@sha256:abc123",
        spatialBlockMap: "artifact:block-map-v2"
      }
    }
  ]
};

module.exports = {
  riskyPacket,
  cleanPacket
};
