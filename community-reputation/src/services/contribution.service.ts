import { PrismaClient, CreditRole } from "@prisma/client";

export interface CreateContributionInput {
  userId: string;
  projectId: string;
  role: CreditRole;
  description?: string;
  occurredAt?: Date;
}

export async function logContribution(prisma: PrismaClient, input: CreateContributionInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new Error("Project not found");

  return prisma.contribution.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      role: input.role,
      description: input.description ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
    include: {
      user: { select: { id: true, name: true, institution: true } },
      project: { select: { id: true, title: true } },
    },
  });
}

export async function listContributions(
  prisma: PrismaClient,
  params: { userId?: string; projectId?: string }
) {
  return prisma.contribution.findMany({
    where: {
      ...(params.userId && { userId: params.userId }),
      ...(params.projectId && { projectId: params.projectId }),
      deletedAt: null,
    },
    include: {
      user: { select: { id: true, name: true, institution: true } },
      project: { select: { id: true, title: true } },
    },
    orderBy: { occurredAt: "asc" },
  });
}
