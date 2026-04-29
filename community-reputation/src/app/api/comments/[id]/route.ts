import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";

// Soft-delete a comment. Only the author may delete their own comment.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();

    const comment = await prisma.comment.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { authorId: true },
    });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.authorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
