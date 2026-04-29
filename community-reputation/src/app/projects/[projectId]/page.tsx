import { notFound } from "next/navigation";
import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { serializeReview } from "@/lib/visibility";
import { CreditRoleTag } from "@/components/CreditRoleTag";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "@/components/ReviewForm";
import { CommentPanel } from "@/components/CommentPanel";

interface PageProps {
  params: { projectId: string };
}

export async function generateMetadata({ params }: PageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { title: true },
  });
  return { title: project?.title ? `${project.title} — SCIBASE` : "Project — SCIBASE" };
}

const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: "Public",
  SEMI_PRIVATE: "Semi-private",
  ANONYMOUS: "Anonymous",
  DOUBLE_BLIND: "Double-blind",
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = params;
  const { userId: viewerId } = await getAuth();

  const [project, contributions, reviews] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: { select: { id: true, name: true, institution: true } } },
    }),
    prisma.contribution.findMany({
      where: { projectId, deletedAt: null },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.review.findMany({
      where: {
        projectId,
        deletedAt: null,
        OR: [
          { status: ReviewStatus.PUBLISHED },
          // Show the authenticated user's own drafts
          ...(viewerId ? [{ status: ReviewStatus.DRAFT, reviewerId: viewerId }] : []),
        ],
      },
      include: {
        reviewer: { select: { id: true, name: true, institution: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!project) notFound();

  // Gather project author IDs for visibility enforcement
  const authorIds = Array.from(new Set([
    project.ownerId,
    ...contributions.map((c) => c.userId),
  ]));

  const serializedReviews = reviews.map((r) =>
    serializeReview(
      {
        ...r,
        reviewer: { id: r.reviewer.id, name: r.reviewer.name, institution: r.reviewer.institution },
      },
      viewerId,
      authorIds
    )
  );

  // Group contributions by contributor
  const contributorMap = new Map<string, { name: string; roles: string[] }>();
  for (const c of contributions) {
    if (!contributorMap.has(c.userId)) {
      contributorMap.set(c.userId, { name: c.user.name ?? "Anonymous", roles: [] });
    }
    contributorMap.get(c.userId)!.roles.push(c.role);
  }

  return (
    <>
      {/* Project header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 className="page-title">{project.title}</h1>
        <p className="page-subtitle">
          Led by{" "}
          <a href={`/users/${project.owner.id}`}>{project.owner.name ?? "Anonymous"}</a>
          {project.owner.institution && ` · ${project.owner.institution}`}
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Left — contributors + review form */}
        <div>
          {/* CRediT contributor graph */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h2 className="section-heading">Contributors (CRediT)</h2>
            {contributorMap.size === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No contributors recorded.
              </p>
            ) : (
              <div className="contrib-graph">
                {Array.from(contributorMap.entries()).map(([uid, { name, roles }]) => (
                  <div key={uid} className="contrib-person">
                    <div className="contrib-person-header">
                      <a href={`/users/${uid}`} style={{ fontWeight: 600 }}>{name}</a>
                    </div>
                    <div className="contrib-person-roles">
                      {roles.map((role) => (
                        <CreditRoleTag key={role} role={role} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit review */}
          <div className="card">
            <h2 className="section-heading">Submit a Review</h2>
            <ReviewForm projectId={projectId} />
          </div>
        </div>

        {/* Right — peer reviews */}
        <div>
          <h2 className="section-heading">
            Peer Reviews{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              ({serializedReviews.length})
            </span>
          </h2>

          {serializedReviews.length === 0 ? (
            <div className="empty-state">No published reviews yet.</div>
          ) : (
            serializedReviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <span className="review-reviewer">
                    {r.reviewer?.name ?? "Anonymous reviewer"}
                    {r.reviewer?.institution && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        {" "}· {r.reviewer.institution}
                      </span>
                    )}
                  </span>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    {r.status === "DRAFT" && (
                      <span className="visibility-pill" style={{ color: "var(--warning)" }}>Draft</span>
                    )}
                    <span className="visibility-pill">
                      {VISIBILITY_LABELS[r.visibility] ?? r.visibility}
                    </span>
                  </div>
                </div>

                {(r.clarity || r.rigor || r.novelty || r.reproducibility) && (
                  <div className="review-scores">
                    {[
                      ["Clarity", r.clarity],
                      ["Rigor", r.rigor],
                      ["Novelty", r.novelty],
                      ["Reproducibility", r.reproducibility],
                    ]
                      .filter(([, v]) => v !== null)
                      .map(([label, v]) => (
                        <div key={label as string} className="review-score-item">
                          <span>{label as string}</span>
                          <StarRating value={v as number} />
                        </div>
                      ))}
                  </div>
                )}

                <p className="review-content">{r.content}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <CommentPanel targetId={r.id} targetType="REVIEW" />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
