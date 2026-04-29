import { PrismaClient } from "@prisma/client";

export async function createEndorsement(
  prisma: PrismaClient,
  endorserId: string,
  endorseeId: string,
  skill: string,
  note?: string
) {
  if (endorserId === endorseeId) throw new Error("Cannot endorse yourself");

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0); // UTC boundary so behaviour is consistent across server timezones
  const dailyCount = await prisma.endorsement.count({
    where: { endorserId, createdAt: { gte: dayStart } },
  });
  if (dailyCount >= 10) throw new Error("Daily endorsement limit reached");

  // Upsert rather than create: if the endorser previously retracted this
  // endorsement the soft-deleted row still satisfies the @@unique constraint,
  // so a plain create would throw P2002.
  return prisma.endorsement.upsert({
    where: { endorserId_endorseeId_skill: { endorserId, endorseeId, skill } },
    create: { endorserId, endorseeId, skill, note: note ?? null },
    update: { deletedAt: null, note: note ?? null },
    include: {
      endorser: { select: { id: true, name: true } },
      endorsee: { select: { id: true, name: true } },
    },
  });
}

export async function removeEndorsement(
  prisma: PrismaClient,
  endorserId: string,
  endorseeId: string,
  skill: string
) {
  const result = await prisma.endorsement.updateMany({
    where: { endorserId, endorseeId, skill, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) throw new Error("Endorsement not found");
  return result;
}

export async function listEndorsements(prisma: PrismaClient, endorseeId: string) {
  return prisma.endorsement.findMany({
    where: { endorseeId, deletedAt: null },
    include: { endorser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
