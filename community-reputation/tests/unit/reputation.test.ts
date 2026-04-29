import { describe, it, expect } from "vitest";
import { computeReputation, type ReputationComponents } from "@/lib/reputation";

const zero: ReputationComponents = {
  reviewsCompleted: 0,
  endorsementsReceived: 0,
  citationsReceived: 0,
  forksReceived: 0,
  reproducibilityVerified: 0,
  bountiesCompleted: 0,
  badgesEarned: 0,
};

describe("computeReputation", () => {
  it("returns 0 for zero activity", () => {
    const { total } = computeReputation(zero);
    expect(total).toBe(0);
  });

  it("breakdown weighted values sum to total", () => {
    const { total, breakdown } = computeReputation({
      ...zero,
      reviewsCompleted: 10,
      endorsementsReceived: 5,
      citationsReceived: 3,
    });
    const sum = breakdown.reduce((acc, b) => acc + b.weighted, 0);
    expect(Math.abs(sum - total)).toBeLessThan(0.01);
  });

  it("applies log1p smoothing — diminishing returns per component", () => {
    const score1 = computeReputation({ ...zero, reviewsCompleted: 1 }).total;
    const score10 = computeReputation({ ...zero, reviewsCompleted: 10 }).total;
    const score100 = computeReputation({ ...zero, reviewsCompleted: 100 }).total;

    // Each 10x increase should yield less than 10x the score
    expect(score10 / score1).toBeLessThan(10);
    expect(score100 / score10).toBeLessThan(10);
  });

  it("all components contribute non-negatively", () => {
    const { breakdown } = computeReputation({
      reviewsCompleted: 5,
      endorsementsReceived: 3,
      citationsReceived: 2,
      forksReceived: 1,
      reproducibilityVerified: 1,
      bountiesCompleted: 1,
      badgesEarned: 2,
    });
    for (const b of breakdown) {
      expect(b.weighted).toBeGreaterThanOrEqual(0);
    }
  });

  it("higher activity produces a higher score", () => {
    const low = computeReputation({ ...zero, reviewsCompleted: 1 }).total;
    const high = computeReputation({ ...zero, reviewsCompleted: 50 }).total;
    expect(high).toBeGreaterThan(low);
  });

  it("breakdown exposes raw, smoothed, and weighted values per component", () => {
    const { breakdown } = computeReputation({ ...zero, reviewsCompleted: 5 });
    const reviews = breakdown.find((b) => b.component === "reviewsCompleted")!;
    expect(reviews.rawValue).toBe(5);
    expect(reviews.smoothed).toBeCloseTo(Math.log1p(5), 5);
    expect(reviews.weighted).toBeCloseTo(25 * Math.log1p(5), 5);
  });
});
