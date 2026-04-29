// Centralised visibility enforcement for reviews.
//
// Every read path MUST pass the raw DB row through serializeReview before
// returning it to callers. The return type is intentionally different from the
// input type so TypeScript prevents accidentally returning an unmasked review.

export interface ReviewerInfo {
  id: string;
  name: string | null;
  institution: string | null;
}

export interface ReviewForSerialization {
  id: string;
  projectId: string;
  reviewerId: string;
  reviewer: ReviewerInfo;
  templateId: string | null;
  clarity: number | null;
  rigor: number | null;
  novelty: number | null;
  reproducibility: number | null;
  content: string;
  visibility: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type SerializedReview = Omit<ReviewForSerialization, "reviewer" | "reviewerId"> & {
  reviewer: ReviewerInfo | null;
  reviewerId: string | null;
};

export function serializeReview(
  review: ReviewForSerialization,
  viewerId: string | null,
  projectAuthorIds: string[]
): SerializedReview {
  const isReviewer = viewerId !== null && viewerId === review.reviewerId;
  const isProjectAuthor = viewerId !== null && projectAuthorIds.includes(viewerId);

  const withIdentity: SerializedReview = {
    ...review,
    reviewer: review.reviewer,
    reviewerId: review.reviewerId,
  };

  const withoutIdentity: SerializedReview = {
    ...review,
    reviewer: null,
    reviewerId: null,
  };

  switch (review.visibility) {
    case "PUBLIC":
      return withIdentity;

    case "SEMI_PRIVATE":
      // Reviewer identity visible only to the reviewer and project authors.
      return isReviewer || isProjectAuthor ? withIdentity : withoutIdentity;

    case "ANONYMOUS":
      // Reviewer identity visible only to the reviewer.
      // Project authors can read the review content but not who wrote it.
      return isReviewer ? withIdentity : withoutIdentity;

    case "DOUBLE_BLIND":
      // Same as ANONYMOUS from the reviewer-identity perspective.
      // (Hiding author identity from the reviewer is handled at the project layer.)
      return isReviewer ? withIdentity : withoutIdentity;

    default:
      return withoutIdentity;
  }
}
