export type FieldType = "score" | "choice" | "text";

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  min?: number; // score fields
  max?: number; // score fields
  options?: string[]; // choice fields
}

export interface ReviewTemplateDefinition {
  discipline: string;
  name: string;
  fields: TemplateField[];
}

export const REVIEW_TEMPLATES: ReviewTemplateDefinition[] = [
  {
    discipline: "general",
    name: "General Scientific Review",
    fields: [
      { id: "clarity", type: "score", label: "Clarity", required: true, min: 1, max: 5 },
      { id: "rigor", type: "score", label: "Scientific Rigor", required: true, min: 1, max: 5 },
      { id: "novelty", type: "score", label: "Novelty", required: true, min: 1, max: 5 },
      {
        id: "reproducibility",
        type: "score",
        label: "Reproducibility",
        required: true,
        min: 1,
        max: 5,
      },
      { id: "summary", type: "text", label: "Summary", required: true },
      { id: "strengths", type: "text", label: "Strengths", required: false },
      { id: "weaknesses", type: "text", label: "Weaknesses", required: false },
      {
        id: "recommendation",
        type: "choice",
        label: "Recommendation",
        required: true,
        options: ["Accept", "Minor Revision", "Major Revision", "Reject"],
      },
    ],
  },
  {
    discipline: "biology",
    name: "Biology / Life Sciences Review",
    fields: [
      { id: "clarity", type: "score", label: "Clarity", required: true, min: 1, max: 5 },
      {
        id: "rigor",
        type: "score",
        label: "Experimental Rigor",
        required: true,
        min: 1,
        max: 5,
      },
      { id: "novelty", type: "score", label: "Novelty", required: true, min: 1, max: 5 },
      {
        id: "reproducibility",
        type: "score",
        label: "Reproducibility",
        required: true,
        min: 1,
        max: 5,
      },
      {
        id: "statistical_methods",
        type: "score",
        label: "Statistical Methods",
        required: false,
        min: 1,
        max: 5,
      },
      {
        id: "ethics",
        type: "choice",
        label: "Ethical Considerations",
        required: true,
        options: ["Adequate", "Needs Improvement", "Major Concerns"],
      },
      { id: "summary", type: "text", label: "Summary", required: true },
      {
        id: "recommendation",
        type: "choice",
        label: "Recommendation",
        required: true,
        options: ["Accept", "Minor Revision", "Major Revision", "Reject"],
      },
    ],
  },
  {
    discipline: "physics",
    name: "Physics / Physical Sciences Review",
    fields: [
      { id: "clarity", type: "score", label: "Clarity", required: true, min: 1, max: 5 },
      {
        id: "rigor",
        type: "score",
        label: "Mathematical / Theoretical Rigor",
        required: true,
        min: 1,
        max: 5,
      },
      { id: "novelty", type: "score", label: "Novelty", required: true, min: 1, max: 5 },
      {
        id: "reproducibility",
        type: "score",
        label: "Reproducibility / Verifiability",
        required: true,
        min: 1,
        max: 5,
      },
      {
        id: "significance",
        type: "score",
        label: "Significance to Field",
        required: false,
        min: 1,
        max: 5,
      },
      { id: "summary", type: "text", label: "Summary", required: true },
      {
        id: "recommendation",
        type: "choice",
        label: "Recommendation",
        required: true,
        options: ["Accept", "Minor Revision", "Major Revision", "Reject"],
      },
    ],
  },
  {
    discipline: "social_sciences",
    name: "Social Sciences Review",
    fields: [
      { id: "clarity", type: "score", label: "Clarity", required: true, min: 1, max: 5 },
      {
        id: "rigor",
        type: "score",
        label: "Methodological Rigor",
        required: true,
        min: 1,
        max: 5,
      },
      { id: "novelty", type: "score", label: "Novelty", required: true, min: 1, max: 5 },
      {
        id: "reproducibility",
        type: "score",
        label: "Reproducibility / Transparency",
        required: true,
        min: 1,
        max: 5,
      },
      {
        id: "positionality",
        type: "text",
        label: "Positionality & Bias Considerations",
        required: false,
      },
      { id: "summary", type: "text", label: "Summary", required: true },
      {
        id: "recommendation",
        type: "choice",
        label: "Recommendation",
        required: true,
        options: ["Accept", "Minor Revision", "Major Revision", "Reject"],
      },
    ],
  },
];
