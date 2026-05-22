export const manuscript = {
  id: "ms-drought-memory-2026",
  title: "Drought Memory in Sorghum Seedlings",
  reuseDisclosure: false,
  passages: [
    {
      id: "p-intro-01",
      section: "Introduction",
      citations: [],
      text:
        "Drought priming creates a durable transcriptional memory that enables sorghum seedlings to reopen stomata faster after repeated water stress while maintaining carbon gain during recovery.",
    },
    {
      id: "p-methods-01",
      section: "Methods",
      citations: ["PROTO-DRY-01"],
      text:
        "Seedlings were grown in controlled chambers at 24 degrees Celsius with a 16 hour photoperiod. Water was withheld until soil moisture reached 35 percent of field capacity, followed by rewatering for 48 hours before the second stress cycle.",
    },
    {
      id: "p-discussion-01",
      section: "Discussion",
      citations: ["10.1101/2025.03.12.123456"],
      text:
        "These findings indicate that drought-conditioned plants retain a stress memory that coordinates guard-cell recovery, root hydraulic conductance, and carbohydrate allocation during the second dehydration cycle.",
    },
    {
      id: "p-results-01",
      section: "Results",
      citations: ["10.5555/retracted.2024.88"],
      text:
        "The kinase inhibitor completely eliminated drought memory and proves that the pathway is both necessary and sufficient for stress recovery across all cereal crops.",
    },
  ],
}

export const sources = [
  {
    id: "SRC-SORGHUM-2024",
    title: "Sorghum seedlings preserve transcriptional drought memory",
    type: "open literature",
    doi: "10.7777/sorghum.2024.12",
    relationship: "external",
    text:
      "Drought priming creates a durable transcriptional memory that enables sorghum seedlings to reopen stomata faster after repeated water stress while maintaining carbon gain during recovery. The response is strongest in early vegetative tissues.",
  },
  {
    id: "PROTO-DRY-01",
    title: "Standard operating procedure for repeated drought stress",
    type: "protocol template",
    relationship: "external",
    text:
      "Seedlings were grown in controlled chambers at 24 degrees Celsius with a 16 hour photoperiod. Water was withheld until soil moisture reached 35 percent of field capacity, followed by rewatering for 48 hours before the second stress cycle. The protocol is commonly cited for repeatable plant stress assays.",
  },
  {
    id: "SELF-PREPRINT-2025",
    title: "Guard-cell recovery after repeated dehydration",
    type: "author preprint",
    doi: "10.1101/2025.03.12.123456",
    relationship: "self",
    text:
      "These findings indicate that drought-conditioned plants retain a stress memory that coordinates guard-cell recovery, root hydraulic conductance, and carbohydrate allocation during the second dehydration cycle. The manuscript should disclose reused wording when carried forward.",
  },
  {
    id: "RETRACTED-KINASE-2024",
    title: "Kinase inhibition eliminates drought memory",
    type: "retracted literature",
    doi: "10.5555/retracted.2024.88",
    relationship: "external",
    retracted: true,
    retractionNotice: "Expression vectors were misidentified and the conclusions were withdrawn.",
    text:
      "The kinase inhibitor completely eliminated drought memory and proves that the pathway is both necessary and sufficient for stress recovery across all cereal crops. The claim was later withdrawn after reagent validation failed.",
  },
  {
    id: "BACKGROUND-ROOTS-2022",
    title: "Root hydraulics under cyclic stress",
    type: "open literature",
    doi: "10.8888/roots.2022.04",
    relationship: "external",
    text:
      "Root hydraulic conductance can change during repeated dehydration, but the response differs by genotype, soil texture, and recovery timing.",
  },
]

export const similarityTriageInput = { manuscript, sources }
