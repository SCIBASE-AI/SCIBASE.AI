import { PrismaClient, ReviewVisibility, ReviewStatus } from "@prisma/client";
import {
  serializeReview,
  type ReviewForSerialization,
  type SerializedReview,
} from "@/lib/visibility";

export interface CreateReviewInput {
  projectId: string;
  reviewerId: string;
  templateId?: string;
  clarity?: number;
  rigor?: number;
  novelty?: number;
  reproducibility?: number;
  content: string;
  visibility?: ReviewVisibility;
  status?: ReviewStatus;
}

export interface ListReviewsQuery {
  projectId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
}

export type ReviewPatch = Partial<
  Pick<
    CreateReviewInput,
    "clarity" | "rigor" | "novelty" | "reproducibility" | "content" | "visibility"
  > & { status: ReviewStatus }
>;

const reviewerSelect = { id: true, name: true, institution: true };

export async function createReview(
  prisma: PrismaClient,
  input: CreateReviewInput
): Promise<ReviewForSerialization> {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error("Project not found");
  if (project.ownerId === input.reviewerId) throw new Error("Cannot review your own project");

  return prisma.review.create({
    data: {
      projectId: input.projectId,
      reviewerId: input.reviewerId,
      templateId: input.templateId,
      clarity: input.clarity,
      rigor: input.rigor,
      novelty: input.novelty,
      reproducibility: input.reproducibility,
      content: input.content,
      visibility: input.visibility ?? ReviewVisibility.PUBLIC,
      status: input.status ?? ReviewStatus.DRAFT,
    },
    include: { reviewer: { select: reviewerSelect } },
  });
}

export async function getReview(
  prisma: PrismaClient,
  id: string,
  viewerId: string | null
): Promise<SerializedReview | null> {
  const review = await prisma.review.findFirst({
    where: {
      id,
      deletedAt: null,
      // Drafts and archived reviews are only visible to the reviewer themselves.
      OR: [{ status: ReviewStatus.PUBLISHED }, { reviewerId: viewerId ?? "" }],
    },
    include: { reviewer: { select: reviewerSelect } },
  });
  if (!review) return null;

  const authorIds = await getProjectAuthorIds(prisma, review.projectId);
  return serializeReview(review as ReviewForSerialization, viewerId, authorIds);
}

export async function listReviews(
  prisma: PrismaClient,
  query: ListReviewsQuery,
  viewerId: string | null
): Promise<SerializedReview[]> {
  const reviews = await prisma.review.findMany({
    where: {
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.reviewerId && { reviewerId: query.reviewerId }),
      status: query.status ?? ReviewStatus.PUBLISHED,
      deletedAt: null,
    },
    include: { reviewer: { select: reviewerSelect } },
    orderBy: { createdAt: "desc" },
  });

  const projectIds = Array.from(new Set(reviews.map((r) => r.projectId)));
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, ownerId: true },
  });
  const authorIdsByProject: Record<string, string[]> = Object.fromEntries(
    projects.map((p) => [p.id, [p.ownerId]])
  );

  return reviews.map((r) =>
    serializeReview(
      r as ReviewForSerialization,
      viewerId,
      authorIdsByProject[r.projectId] ?? []
    )
  );
}

export async function updateReview(
  prisma: PrismaClient,
  id: string,
  actorId: string,
  patch: ReviewPatch
): Promise<SerializedReview> {
  const review = await prisma.review.findFirst({ where: { id, deletedAt: null } });
  if (!review) throw new Error("Review not found");
  if (review.reviewerId !== actorId) throw new Error("Forbidden");

  const updated = await prisma.review.update({
    where: { id },
    data: patch,
    include: { reviewer: { select: reviewerSelect } },
  });

  // Route the PATCH response through the same serializer as every GET — the
  // actor is always the reviewer (enforced above) so they will see full identity,
  // but the path stays consistent if permissions are ever widened (e.g. moderator edits).
  const authorIds = await getProjectAuthorIds(prisma, updated.projectId);
  return serializeReview(updated as ReviewForSerialization, actorId, authorIds);
}

async function getProjectAuthorIds(prisma: PrismaClient, projectId: string): Promise<string[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project ? [project.ownerId] : [];
}
