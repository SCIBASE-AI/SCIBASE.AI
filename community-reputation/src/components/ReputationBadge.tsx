import type { ReputationBreakdown } from "@/lib/reputation";

const COMPONENT_LABELS: Record<string, string> = {
  reviewsCompleted: "Reviews",
  endorsementsReceived: "Endorsements",
  citationsReceived: "Citations",
  forksReceived: "Forks",
  reproducibilityVerified: "Reproducibility",
  bountiesCompleted: "Bounties",
  badgesEarned: "Badges",
};

interface Props {
  total: number;
  breakdown?: ReputationBreakdown[];
  size?: "sm" | "md";
}

export function ReputationBadge({ total, breakdown, size = "md" }: Props) {
  if (size === "sm") {
    return (
      <span className="rep-score">
        ◈ {total.toFixed(1)}
      </span>
    );
  }

  const maxWeighted = breakdown
    ? Math.max(...breakdown.map((b) => b.weighted), 1)
    : 1;

  return (
    <div>
      <div style={{ marginBottom: "0.75rem" }}>
        <span className="rep-score" style={{ fontSize: "1rem", padding: "0.3rem 1rem" }}>
          ◈ {total.toFixed(2)} reputation
        </span>
      </div>
      {breakdown && breakdown.length > 0 && (
        <ul className="breakdown-list">
          {breakdown.map((b) => (
            <li key={b.component} className="breakdown-item">
              <span className="label">{COMPONENT_LABELS[b.component] ?? b.component}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(b.weighted / maxWeighted) * 100}%` }}
                />
              </div>
              <span className="value">{b.weighted.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
