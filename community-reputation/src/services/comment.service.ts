import { PrismaClient, CommentTargetType, Prisma } from "@prisma/client";

export interface CreateCommentInput {
  authorId: string;
  body: string;
  anchor?: Prisma.InputJsonValue; // { start, end } | { line } | { cell, offset }
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
}

export async function addComment(prisma: PrismaClient, input: CreateCommentInput) {
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: input.parentId, deletedAt: null },
    });
    if (!parent) throw new Error("Parent comment not found");
  }

  return prisma.comment.create({
    data: {
      authorId: input.authorId,
      body: input.body,
      anchor: input.anchor ?? Prisma.JsonNull,
      targetType: input.targetType,
      targetId: input.targetId,
      parentId: input.parentId ?? null,
    },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function listComments(
  prisma: PrismaClient,
  targetType: CommentTargetType,
  targetId: string
) {
  return prisma.comment.findMany({
    where: { targetType, targetId, deletedAt: null, parentId: null },
    include: {
      author: { select: { id: true, name: true } },
      replies: {
        where: { deletedAt: null },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
