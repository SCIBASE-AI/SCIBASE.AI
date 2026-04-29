import { describe, it, expect } from "vitest";
import { evaluateBadges } from "@/lib/badges";
import type { Badge } from "@prisma/client";
import type { ReputationComponents } from "@/lib/reputation";

function makeBadge(
  slug: string,
  component: string,
  value: number,
  id = slug
): Badge {
  return {
    id,
    slug,
    name: slug,
    description: "",
    threshold: { component, value },
    createdAt: new Date(),
  };
}

const zero: ReputationComponents = {
  reviewsCompleted: 0,
  endorsementsReceived: 0,
  citationsReceived: 0,
  forksReceived: 0,
  reproducibilityVerified: 0,
  bountiesCompleted: 0,
  badgesEarned: 0,
};

const allBadges: Badge[] = [
  makeBadge("trusted_reviewer", "reviewsCompleted", 10),
  makeBadge("open_science_champion", "endorsementsReceived", 20),
  makeBadge("high_scorer", "total", 50),
];

describe("evaluateBadges", () => {
  it("awards no badges when no thresholds are met", () => {
    const result = evaluateBadges(zero, 0, allBadges, []);
    expect(result).toHaveLength(0);
  });

  it("awards a component-based badge when threshold is met", () => {
    const result = evaluateBadges(
      { ...zero, reviewsCompleted: 10 },
      0,
      allBadges,
      []
    );
    expect(result.map((b) => b.slug)).toContain("trusted_reviewer");
  });

  it("awards a total-based badge when total meets threshold", () => {
    const result = evaluateBadges(zero, 50, allBadges, []);
    expect(result.map((b) => b.slug)).toContain("high_scorer");
  });

  it("does not re-award an already earned badge", () => {
    const existing = [makeBadge("trusted_reviewer", "reviewsCompleted", 10)];
    const result = evaluateBadges(
      { ...zero, reviewsCompleted: 100 },
      0,
      allBadges,
      existing
    );
    expect(result.map((b) => b.slug)).not.toContain("trusted_reviewer");
  });

  it("can award multiple badges at once", () => {
    const result = evaluateBadges(
      { ...zero, reviewsCompleted: 10, endorsementsReceived: 20 },
      0,
      allBadges,
      []
    );
    expect(result.length).toBe(2);
  });
});
