// Composite reputation scorer.
//
// Design principles:
//   - Pure function: no DB calls. The caller gathers components and passes them in.
//   - log1p smoothing per component prevents power-user dominance.
//   - Transparent breakdown so the UI can show *why* a score is what it is.
//   - Weights are intentionally visible here so they can be audited and tuned.

export interface ReputationComponents {
  reviewsCompleted: number;
  endorsementsReceived: number;
  citationsReceived: number;
  forksReceived: number;
  reproducibilityVerified: number;
  bountiesCompleted: number;
  badgesEarned: number;
}

export interface ReputationBreakdown {
  component: keyof ReputationComponents;
  rawValue: number;
  smoothed: number; // log1p(rawValue)
  weighted: number; // weight * smoothed
}

export interface ReputationResult {
  total: number;
  breakdown: ReputationBreakdown[];
}

// Weights sum to 100 for easy mental arithmetic about relative contribution.
const WEIGHTS: Record<keyof ReputationComponents, number> = {
  reviewsCompleted: 25,
  endorsementsReceived: 20,
  citationsReceived: 20,
  forksReceived: 10,
  reproducibilityVerified: 10,
  bountiesCompleted: 10,
  badgesEarned: 5,
};

export function computeReputation(components: ReputationComponents): ReputationResult {
  const breakdown: ReputationBreakdown[] = [];
  let total = 0;

  for (const [key, weight] of Object.entries(WEIGHTS) as [keyof ReputationComponents, number][]) {
    const rawValue = components[key] ?? 0;
    const smoothed = Math.log1p(rawValue);
    const weighted = weight * smoothed;
    breakdown.push({ component: key, rawValue, smoothed, weighted });
    total += weighted;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
}
