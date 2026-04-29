import type { Badge } from "@prisma/client";
import type { ReputationComponents } from "./reputation";

type BadgeThreshold = {
  component: keyof ReputationComponents | "total";
  value: number;
};

// Returns badges from allBadges whose threshold the user now meets and hasn't yet earned.
export function evaluateBadges(
  components: ReputationComponents,
  total: number,
  allBadges: Badge[],
  existingBadges: Badge[]
): Badge[] {
  const existingIds = new Set(existingBadges.map((b) => b.id));

  return allBadges.filter((badge) => {
    if (existingIds.has(badge.id)) return false;
    const threshold = badge.threshold as unknown as BadgeThreshold;
    const value =
      threshold.component === "total"
        ? total
        : (components[threshold.component as keyof ReputationComponents] ?? 0);
    return value >= threshold.value;
  });
}
