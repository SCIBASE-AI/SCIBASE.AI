import { describe, it, expect } from "vitest";
import { serializeReview, type ReviewForSerialization } from "@/lib/visibility";

function makeReview(
  visibility: string,
  opts: { reviewerId?: string } = {}
): ReviewForSerialization {
  const reviewerId = opts.reviewerId ?? "user-reviewer";
  return {
    id: "review-1",
    projectId: "project-1",
    reviewerId,
    reviewer: { id: reviewerId, name: "Alice Researcher", institution: "MIT" },
    templateId: null,
    clarity: 4,
    rigor: 5,
    novelty: 3,
    reproducibility: 4,
    content: "Solid methodology.",
    visibility,
    status: "PUBLISHED",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
  };
}

describe("serializeReview", () => {
  describe("PUBLIC", () => {
    it("exposes reviewer identity to any viewer", () => {
      const result = serializeReview(makeReview("PUBLIC"), "any-user", []);
      expect(result.reviewerId).toBe("user-reviewer");
      expect(result.reviewer?.name).toBe("Alice Researcher");
    });

    it("exposes reviewer identity to unauthenticated viewers", () => {
      const result = serializeReview(makeReview("PUBLIC"), null, []);
      expect(result.reviewerId).toBe("user-reviewer");
    });
  });

  describe("SEMI_PRIVATE", () => {
    it("exposes reviewer to project authors", () => {
      const result = serializeReview(makeReview("SEMI_PRIVATE"), "author-1", ["author-1"]);
      expect(result.reviewerId).toBe("user-reviewer");
      expect(result.reviewer).not.toBeNull();
    });

    it("exposes reviewer to the reviewer themselves", () => {
      const result = serializeReview(makeReview("SEMI_PRIVATE"), "user-reviewer", []);
      expect(result.reviewerId).toBe("user-reviewer");
    });

    it("strips reviewer from outsiders", () => {
      const result = serializeReview(makeReview("SEMI_PRIVATE"), "outsider", ["author-1"]);
      expect(result.reviewerId).toBeNull();
      expect(result.reviewer).toBeNull();
    });

    it("strips reviewer from unauthenticated visitors", () => {
      const result = serializeReview(makeReview("SEMI_PRIVATE"), null, ["author-1"]);
      expect(result.reviewerId).toBeNull();
    });
  });

  describe("ANONYMOUS", () => {
    it("strips reviewer identity from project authors", () => {
      const result = serializeReview(makeReview("ANONYMOUS"), "author-1", ["author-1"]);
      expect(result.reviewerId).toBeNull();
      expect(result.reviewer).toBeNull();
    });

    it("exposes reviewer identity to themselves", () => {
      const result = serializeReview(makeReview("ANONYMOUS"), "user-reviewer", ["author-1"]);
      expect(result.reviewerId).toBe("user-reviewer");
    });

    it("strips reviewer from unauthenticated visitors", () => {
      const result = serializeReview(makeReview("ANONYMOUS"), null, []);
      expect(result.reviewerId).toBeNull();
    });

    it("strips reviewer from third-party users", () => {
      const result = serializeReview(makeReview("ANONYMOUS"), "random-user", []);
      expect(result.reviewerId).toBeNull();
    });
  });

  describe("DOUBLE_BLIND", () => {
    it("strips reviewer from project authors", () => {
      const result = serializeReview(makeReview("DOUBLE_BLIND"), "author-1", ["author-1"]);
      expect(result.reviewerId).toBeNull();
      expect(result.reviewer).toBeNull();
    });

    it("exposes reviewer identity only to themselves", () => {
      const result = serializeReview(makeReview("DOUBLE_BLIND"), "user-reviewer", ["author-1"]);
      expect(result.reviewerId).toBe("user-reviewer");
    });

    it("strips reviewer from unauthenticated visitors", () => {
      const result = serializeReview(makeReview("DOUBLE_BLIND"), null, []);
      expect(result.reviewerId).toBeNull();
    });
  });

  it("preserves all non-identity fields regardless of visibility", () => {
    const review = makeReview("ANONYMOUS");
    const result = serializeReview(review, "outsider", []);
    expect(result.id).toBe("review-1");
    expect(result.content).toBe("Solid methodology.");
    expect(result.clarity).toBe(4);
    expect(result.status).toBe("PUBLISHED");
  });
});
