import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommentTargetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { addComment, listComments } from "@/services/comment.service";

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  anchor: z.record(z.unknown()).optional().transform((v) => v as import("@prisma/client").Prisma.InputJsonValue | undefined),
  targetType: z.nativeEnum(CommentTargetType),
  targetId: z.string().min(1),
  parentId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = CreateCommentSchema.parse(await req.json());
    const comment = await addComment(prisma, { ...body, authorId: userId });
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: "targetType and targetId query params are required" },
        { status: 400 }
      );
    }

    if (!Object.values(CommentTargetType).includes(targetType as CommentTargetType)) {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 422 });
    }

    const comments = await listComments(prisma, targetType as CommentTargetType, targetId);
    return NextResponse.json(comments);
  } catch (e) {
    return handleError(e);
  }
}
