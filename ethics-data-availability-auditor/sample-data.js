const samplePacket = {
  manuscriptId: "MS-ETHICS-042",
  title: "Multisite sleep biomarker study",
  sections: {
    ethics:
      "The protocol was reviewed by the Northbridge IRB under NB-2026-118. Adult participants provided written consent.",
    dataAvailability:
      "De-identified actigraphy summaries will be deposited in Dryad after publication.",
    codeAvailability:
      "Analysis notebooks are available in the project repository under an MIT license.",
  },
  claims: [
    {
      id: "C1",
      text: "The primary model used 438 participant nights across three sites.",
      evidenceIds: ["D1", "A1"],
      requiresData: true,
      requiresCode: true,
    },
    {
      id: "C2",
      text: "A subgroup analysis was run after sensor dropout review.",
      evidenceIds: ["D2"],
      requiresData: true,
      requiresCode: true,
    },
    {
      id: "C3",
      text: "Participants gave written consent before sensor deployment.",
      evidenceIds: ["E1"],
      requiresData: false,
      requiresCode: false,
    },
  ],
  artifacts: [
    {
      id: "D1",
      type: "dataset",
      label: "Dryad sleep summary export",
      access: "embargoed",
      license: "CC-BY-4.0",
      repository: "Dryad",
      availabilityStatement: "Deposited after publication",
    },
    {
      id: "A1",
      type: "analysis-code",
      label: "Primary model notebook",
      access: "public",
      license: "MIT",
      repository: "GitHub",
    },
    {
      id: "D2",
      type: "dataset",
      label: "Sensor dropout review table",
      access: "internal",
      license: "",
      repository: "",
      availabilityStatement: "",
    },
    {
      id: "E1",
      type: "ethics-record",
      label: "Northbridge IRB approval",
      access: "restricted",
      license: "institutional",
      repository: "IRB archive",
      availabilityStatement: "Available to journal editors on request",
    },
  ],
  participantGroups: ["adults"],
};

module.exports = {
  samplePacket,
};
