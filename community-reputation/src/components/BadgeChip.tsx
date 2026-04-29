interface BadgeData {
  slug: string;
  name: string;
  description: string;
}

interface Props {
  badge: BadgeData;
}

const BADGE_ICONS: Record<string, string> = {
  "first-review": "✍",
  "prolific-reviewer": "📝",
  "trusted-reviewer": "⭐",
  "peer-review-legend": "🏆",
  "first-endorsement": "👍",
  "well-endorsed": "🎖",
  "first-reproduction": "🔬",
  "reproducibility-champion": "🛡",
  default: "◉",
};

export function BadgeChip({ badge }: Props) {
  const icon = BADGE_ICONS[badge.slug] ?? BADGE_ICONS.default;
  return (
    <span className="badge-chip" title={badge.description}>
      <em className="icon">{icon}</em>
      {badge.name}
    </span>
  );
}
