const cleanPacket = {
  graphId: "KG-CHEM-CLEAN",
  policy: {
    mergeSaltForms: false
  },
  compounds: [
    {
      id: "cmpd-warfarin-r",
      label: "R-warfarin",
      inchiKey: "PJVWKTKQMONHTI-HNNXBMFYSA-N",
      isomericSmiles: "CC(=O)CC(C1=CC=CC=C1)C2=C(C=CC(=C2O)O)C(=O)O[C@H]3CCCO3",
      requiresStereochemistry: true,
      form: "freebase",
      synonyms: ["R-warfarin"],
      evidence: {
        doi: "10.1000/warfarin.identity",
        sourceType: "curated-chemistry"
      }
    },
    {
      id: "cmpd-warfarin-sodium",
      label: "Warfarin sodium",
      inchiKey: "PJVWKTKQMONHTI-HNNXBMFYSA-N",
      isomericSmiles: "CC(=O)CC(C1=CC=CC=C1)C2=C(C=CC(=C2O)O)C(=O)O[C@H]3CCCO3.[Na+]",
      requiresStereochemistry: true,
      form: "sodium salt",
      synonyms: ["warfarin sodium"],
      evidence: {
        doi: "10.1000/warfarin.sodium",
        sourceType: "curated-chemistry"
      }
    }
  ],
  edges: [
    {
      id: "edge-warfarin-form",
      source: "cmpd-warfarin-sodium",
      target: "cmpd-warfarin-r",
      relationship: "form_of",
      evidence: {
        doi: "10.1000/warfarin.sodium",
        sourceType: "curated-chemistry"
      }
    },
    {
      id: "edge-warfarin-assay",
      source: "cmpd-warfarin-r",
      target: "assay-anticoagulation-1",
      relationship: "tested_in_assay",
      assayContext: {
        matrix: "plasma",
        concentrationUnit: "uM",
        compatibleForms: ["freebase"]
      },
      evidence: {
        doi: "10.1000/warfarin.assay",
        sourceType: "assay-publication"
      }
    }
  ]
};

const riskyPacket = {
  graphId: "KG-CHEM-RISK",
  policy: {
    mergeSaltForms: false
  },
  compounds: [
    {
      id: "cmpd-thalidomide-ambiguous",
      label: "Thalidomide",
      inchiKey: "UEJJHQNACJXSKW-UHFFFAOYSA-N",
      isomericSmiles: "O=C1NC(=O)C(c2ccccc2)N1",
      requiresStereochemistry: true,
      form: "freebase",
      synonyms: ["thalidomide", "alpha compound", "alpha-compound"],
      evidence: {
        doi: "",
        sourceType: ""
      }
    },
    {
      id: "cmpd-alpha-other",
      label: "Alpha unrelated scaffold",
      inchiKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
      isomericSmiles: "CC(C)C1=CC=CC=C1",
      requiresStereochemistry: false,
      form: "freebase",
      synonyms: ["Alpha Compound"],
      evidence: {
        doi: "10.1000/alpha.identity",
        sourceType: "curated-chemistry"
      }
    },
    {
      id: "cmpd-caffeine-citrate",
      label: "Caffeine citrate",
      parentCompoundId: "cmpd-caffeine-freebase",
      inchiKey: "RYYVLZVUVIJVGH-UHFFFAOYSA-N",
      isomericSmiles: "Cn1cnc2n(C)c(=O)n(C)c(=O)c12.O=C(O)CC(O)(CC(=O)O)C(=O)O",
      requiresStereochemistry: false,
      form: "citrate salt",
      synonyms: ["caffeine citrate"],
      evidence: {
        doi: "10.1000/caffeine.citrate",
        sourceType: "curated-chemistry"
      }
    },
    {
      id: "cmpd-caffeine-freebase",
      label: "Caffeine",
      inchiKey: "RYYVLZVUVIJVGH-UHFFFAOYSA-N",
      isomericSmiles: "Cn1cnc2n(C)c(=O)n(C)c(=O)c12",
      requiresStereochemistry: false,
      form: "freebase",
      synonyms: ["caffeine"],
      evidence: {
        doi: "10.1000/caffeine.freebase",
        sourceType: "curated-chemistry"
      }
    },
    {
      id: "cmpd-tracer",
      label: "Tracer X",
      inchiKey: "BADKEY",
      isomericSmiles: "",
      requiresStereochemistry: false,
      isotopeLabeled: true,
      isotopeLabel: "",
      form: "freebase",
      synonyms: ["Tracer X"],
      evidence: {
        doi: "10.1000/tracer.identity",
        sourceType: "curated-chemistry"
      }
    }
  ],
  edges: [
    {
      id: "edge-bad-same-as",
      source: "cmpd-thalidomide-ambiguous",
      target: "cmpd-alpha-other",
      relationship: "same_as",
      evidence: {
        doi: "10.1000/sameas.bad",
        sourceType: "imported-graph"
      }
    },
    {
      id: "edge-form-conflation",
      source: "cmpd-caffeine-citrate",
      target: "cmpd-caffeine-freebase",
      relationship: "same_as",
      evidence: {
        doi: "10.1000/caffeine.citrate",
        sourceType: "imported-graph"
      }
    },
    {
      id: "edge-assay-incomplete",
      source: "cmpd-caffeine-citrate",
      target: "assay-dose-response-7",
      relationship: "tested_in_assay",
      assayContext: {
        compatibleForms: ["freebase"]
      },
      evidence: {
        doi: "",
        sourceType: ""
      }
    },
    {
      id: "edge-missing-target",
      source: "cmpd-tracer",
      target: "cmpd-missing",
      relationship: "same_as",
      evidence: {
        doi: "10.1000/tracer.edge",
        sourceType: "imported-graph"
      }
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
