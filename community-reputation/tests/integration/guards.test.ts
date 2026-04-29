import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";
import { createReview, getReview } from "@/services/review.service";
import { createEndorsement, removeEndorsement } from "@/services/endorsement.service";

async function createUser(email: string) {
  return testPrisma.user.create({ data: { email, name: email.split("@")[0] } });
}

describe("Self-review prevention", () => {
  it("throws when the reviewer is the project owner", async () => {
    const owner = await createUser("owner@example.com");
    const project = await testPrisma.project.create({
      data: { title: "My Project", ownerId: owner.id },
    });

    await expect(
      createReview(testPrisma, {
        projectId: project.id,
        reviewerId: owner.id,
        content: "I love my own work.",
      })
    ).rejects.toThrow("Cannot review your own project");
  });

  it("allows a different user to review the project", async () => {
    const owner = await createUser("owner2@example.com");
    const reviewer = await createUser("reviewer2@example.com");
    const project = await testPrisma.project.create({
      data: { title: "Their Project", ownerId: owner.id },
    });

    await expect(
      createReview(testPrisma, {
        projectId: project.id,
        reviewerId: reviewer.id,
        content: "Looks good.",
      })
    ).resolves.not.toThrow();
  });
});

describe("Endorsement guards", () => {
  it("throws when endorsing yourself", async () => {
    const user = await createUser("self@example.com");
    await expect(
      createEndorsement(testPrisma, user.id, user.id, "writing")
    ).rejects.toThrow("Cannot endorse yourself");
  });

  it("throws after 10 endorsements in a single day", async () => {
    const endorser = await createUser("ratelimit-endorser@example.com");
    const targets = await Promise.all(
      Array.from({ length: 11 }, (_, i) =>
        createUser(`ratelimit-target-${i}@example.com`)
      )
    );

    for (let i = 0; i < 10; i++) {
      await createEndorsement(testPrisma, endorser.id, targets[i].id, "writing");
    }
    await expect(
      createEndorsement(testPrisma, endorser.id, targets[10].id, "writing")
    ).rejects.toThrow("Daily endorsement limit reached");
  });

  it("allows re-endorsement after retraction (no P2002 on upsert)", async () => {
    const endorser = await createUser("re-endorse-a@example.com");
    const endorsee = await createUser("re-endorse-b@example.com");

    await createEndorsement(testPrisma, endorser.id, endorsee.id, "statistics");
    await removeEndorsement(testPrisma, endorser.id, endorsee.id, "statistics");

    // Without upsert this would throw a unique-constraint violation
    await expect(
      createEndorsement(testPrisma, endorser.id, endorsee.id, "statistics")
    ).resolves.not.toThrow();

    const live = await testPrisma.endorsement.findFirst({
      where: { endorserId: endorser.id, endorseeId: endorsee.id, skill: "statistics", deletedAt: null },
    });
    expect(live).not.toBeNull();
  });
});

describe("Draft review visibility", () => {
  it("getReview hides a DRAFT from a third-party viewer", async () => {
    const owner = await createUser("draft-owner@example.com");
    const reviewer = await createUser("draft-reviewer@example.com");
    const outsider = await createUser("draft-outsider@example.com");
    const project = await testPrisma.project.create({
      data: { title: "Draft Project", ownerId: owner.id },
    });

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Not published yet.",
    });
    // review is DRAFT by default

    expect(await getReview(testPrisma, review.id, outsider.id)).toBeNull();
    expect(await getReview(testPrisma, review.id, null)).toBeNull();
  });

  it("getReview shows a DRAFT to the reviewer who wrote it", async () => {
    const owner = await createUser("draft-owner2@example.com");
    const reviewer = await createUser("draft-reviewer2@example.com");
    const project = await testPrisma.project.create({
      data: { title: "Draft Project 2", ownerId: owner.id },
    });

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "My draft.",
    });

    const result = await getReview(testPrisma, review.id, reviewer.id);
    expect(result).not.toBeNull();
    expect(result!.content).toBe("My draft.");
  });
});
