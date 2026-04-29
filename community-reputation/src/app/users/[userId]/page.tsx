import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gatherComponents } from "@/services/reputation.service";
import { computeReputation } from "@/lib/reputation";
import { ReputationBadge } from "@/components/ReputationBadge";
import { BadgeChip } from "@/components/BadgeChip";
import { CreditRoleTag } from "@/components/CreditRoleTag";
import { EndorseButton } from "@/components/EndorseButton";

interface PageProps {
  params: { userId: string };
}

export async function generateMetadata({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true },
  });
  return { title: user?.name ? `${user.name} — SCIBASE` : "Researcher — SCIBASE" };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = params;

  const [user, latestSnapshot, badges, contributions, endorsements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, institution: true, domain: true, region: true, createdAt: true },
    }),
    prisma.reputationSnapshot.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: { select: { slug: true, name: true, description: true } } },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.contribution.findMany({
      where: { userId, deletedAt: null },
      include: { project: { select: { id: true, title: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.endorsement.findMany({
      where: { endorseeId: userId, deletedAt: null },
      select: { skill: true, note: true, endorser: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) notFound();

  // Compute live reputation if no snapshot exists yet
  let total = latestSnapshot?.total ?? 0;
  let breakdown = latestSnapshot?.breakdown as { component: string; rawValue: number; smoothed: number; weighted: number }[] | null;

  if (!latestSnapshot) {
    const components = await gatherComponents(prisma, userId);
    const result = computeReputation(components);
    total = result.total;
    breakdown = result.breakdown;
  }

  // Group endorsements by skill
  const endorsementsBySkill = endorsements.reduce<Record<string, { count: number; endorsers: string[] }>>(
    (acc, e) => {
      if (!acc[e.skill]) acc[e.skill] = { count: 0, endorsers: [] };
      acc[e.skill].count++;
      if (e.endorser?.name) acc[e.skill].endorsers.push(e.endorser.name);
      return acc;
    },
    {}
  );

  const initials = (user.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Profile header */}
      <div className="profile-header">
        <div className="avatar">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "avatar"} />
          ) : (
            initials
          )}
        </div>
        <div className="profile-meta">
          <h1>{user.name ?? "Anonymous Researcher"}</h1>
          <p className="meta-line">
            {[user.institution, user.domain, user.region].filter(Boolean).join(" · ")}
          </p>
          <p className="meta-line" style={{ marginTop: "0.5rem" }}>
            <ReputationBadge total={total} size="sm" />
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <EndorseButton endorseeId={userId} />
        </div>
      </div>

      <div className="grid-2">
        {/* Left column */}
        <div>
          {/* Reputation breakdown */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 className="section-heading">Reputation</h2>
            <ReputationBadge
              total={total}
              breakdown={breakdown as Parameters<typeof ReputationBadge>[0]["breakdown"]}
            />
          </div>

          {/* Badges */}
          <div className="card">
            <h2 className="section-heading">Badges</h2>
            {badges.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No badges yet.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {badges.map((ub) => (
                  <BadgeChip key={ub.id} badge={ub.badge} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Endorsements */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 className="section-heading">Endorsements</h2>
            {Object.keys(endorsementsBySkill).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No endorsements yet.</p>
            ) : (
              <div>
                {Object.entries(endorsementsBySkill)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([skill, { count, endorsers }]) => (
                    <div key={skill} className="endorsement-group">
                      <span className="endorsement-skill">{skill}</span>
                      <span
                        className="endorsement-count"
                        title={`Endorsed by: ${endorsers.join(", ")}`}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* CRediT contributions */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
              <h2 className="section-heading" style={{ marginBottom: 0 }}>Contributions</h2>
              <a
                href={`/api/contributions/export?userId=${userId}`}
                style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
              >
                Export CSV
              </a>
            </div>
            {contributions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No contributions recorded.</p>
            ) : (
              <ul className="contrib-list">
                {contributions.map((c) => (
                  <li key={c.id} className="contrib-item">
                    <CreditRoleTag role={c.role} />
                    <div>
                      <a className="project-link" href={`/projects/${c.project.id}`}>
                        {c.project.title}
                      </a>
                      {c.description && (
                        <p className="description">{c.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
