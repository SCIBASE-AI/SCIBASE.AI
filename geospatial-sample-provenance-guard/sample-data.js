const project = {
  asOfDate: "2026-05-22",
  policy: {
    requiredCrs: "EPSG:4326",
    maxPublicPrecisionDecimals: 3,
    sensitiveLabels: ["endangered-species", "sacred-site", "private-land"],
    acceptedCountryBounds: {
      Kenya: { minLat: -4.9, maxLat: 5.1, minLon: 33.5, maxLon: 42.0 },
      Peru: { minLat: -18.5, maxLat: 0.2, minLon: -82.0, maxLon: -68.0 },
      Iceland: { minLat: 63.0, maxLat: 67.5, minLon: -25.0, maxLon: -12.0 }
    },
    maxCollectionFutureDays: 0,
    publicRecommendationRequiresDatasetDoi: true
  },
  graphPacket: {
    id: "kg-field-samples-2026-05",
    entityPage: "field-sample-climate-adaptation",
    recommendationMode: "public-discovery"
  },
  datasets: [
    {
      id: "dataset-kenya-plant",
      doi: "10.5281/zenodo.2026052201",
      title: "Synthetic East Africa Plant Trait Survey",
      license: "CC-BY-4.0"
    },
    {
      id: "dataset-peru-water",
      doi: "10.5281/zenodo.2026052202",
      title: "Synthetic Mountain Watershed Samples",
      license: "CC0-1.0"
    }
  ],
  samples: [
    {
      id: "sample-001",
      label: "Highland plant voucher",
      country: "Kenya",
      latitude: -0.27342,
      longitude: 36.07119,
      crs: "EPSG:4326",
      precisionDecimals: 5,
      collectionDate: "2026-04-12",
      datasetDoi: "10.5281/zenodo.2026052201",
      voucherId: "EAH-2026-0412",
      labels: ["endangered-species"],
      publicRecommendation: true
    },
    {
      id: "sample-002",
      label: "Watershed sediment core",
      country: "Peru",
      latitude: 12.543,
      longitude: -76.812,
      crs: "EPSG:3857",
      precisionDecimals: 3,
      collectionDate: "2026-06-30",
      datasetDoi: "10.5281/zenodo.unknown",
      voucherId: "",
      labels: [],
      publicRecommendation: true
    },
    {
      id: "sample-003",
      label: "Basalt reference swab",
      country: "Iceland",
      latitude: 64.145,
      longitude: -21.942,
      crs: "EPSG:4326",
      precisionDecimals: 3,
      collectionDate: "2026-03-04",
      datasetDoi: "10.5281/zenodo.2026052202",
      voucherId: "IS-NHM-7781",
      labels: [],
      publicRecommendation: true
    }
  ],
  edges: [
    { id: "edge-1", from: "sample-001", to: "dataset-kenya-plant", predicate: "includedInDataset" },
    { id: "edge-2", from: "sample-002", to: "dataset-peru-water", predicate: "includedInDataset" },
    { id: "edge-3", from: "sample-003", to: "dataset-peru-water", predicate: "includedInDataset" }
  ]
};

module.exports = { project };
