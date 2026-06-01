const cleanDocument = {
  documentId: "editor-term-001",
  title: "Collaborative catalyst manuscript",
  glossary: {
    HER: "hydrogen evolution reaction",
    RHE: "reversible hydrogen electrode",
    FE: "faradaic efficiency",
  },
  units: {
    currentDensity: "mA cm^-2",
    potential: "V vs RHE",
    temperature: "K",
  },
  variables: {
    eta: "overpotential",
    j: "current density",
    T: "temperature",
  },
  blocks: [
    {
      id: "intro",
      author: "alice",
      text: "The hydrogen evolution reaction (HER) was measured versus the reversible hydrogen electrode (RHE).",
      acronyms: [{ short: "HER", long: "hydrogen evolution reaction" }, { short: "RHE", long: "reversible hydrogen electrode" }],
      units: [{ quantity: "potential", unit: "V vs RHE" }],
      variables: [],
    },
    {
      id: "results",
      author: "bob",
      text: "The HER reached 42 mA cm^-2 and 91% faradaic efficiency (FE) at 298 K.",
      acronyms: [{ short: "FE", long: "faradaic efficiency" }],
      units: [
        { quantity: "currentDensity", unit: "mA cm^-2" },
        { quantity: "temperature", unit: "K" },
      ],
      variables: [
        { symbol: "eta", meaning: "overpotential" },
        { symbol: "j", meaning: "current density" },
      ],
    },
  ],
  suggestions: [
    {
      id: "sug-1",
      author: "carol",
      targetBlock: "results",
      text: "Clarify that eta is the overpotential used for Tafel analysis.",
      acronyms: [],
      units: [],
      variables: [{ symbol: "eta", meaning: "overpotential" }],
    },
  ],
};

const riskyDocument = {
  ...cleanDocument,
  documentId: "editor-term-002",
  blocks: [
    {
      id: "abstract",
      author: "alice",
      text: "HER improves at 25 C with strong FE, but no first-use expansions are provided.",
      acronyms: [{ short: "HER", long: "" }, { short: "FE", long: "" }],
      units: [{ quantity: "temperature", unit: "C" }],
      variables: [{ symbol: "eta", meaning: "efficiency" }],
    },
    {
      id: "methods",
      author: "bob",
      text: "Current density j was normalized as A/m2, and E was reported versus Ag/AgCl.",
      acronyms: [{ short: "RHE", long: "rapid heat exchange" }],
      units: [
        { quantity: "currentDensity", unit: "A m^-2" },
        { quantity: "potential", unit: "V vs Ag/AgCl" },
      ],
      variables: [
        { symbol: "j", meaning: "flux" },
        { symbol: "E", meaning: "electrode potential" },
      ],
    },
  ],
  suggestions: [
    {
      id: "sug-risk",
      author: "dana",
      targetBlock: "methods",
      text: "Rename RHE to rapid heat exchange throughout.",
      acronyms: [{ short: "RHE", long: "rapid heat exchange" }],
      units: [],
      variables: [],
    },
  ],
};

module.exports = {
  cleanDocument,
  riskyDocument,
};
