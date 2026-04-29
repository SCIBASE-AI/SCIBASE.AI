import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";
import { CREDIT_LABELS, CreditRole } from "@/lib/credit";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/contributions/export?userId=<id>
// Returns a CRediT-aligned CSV suitable for tenure/promotion applications.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const contributions = await prisma.contribution.findMany({
      where: { userId, deletedAt: null },
      include: { project: { select: { id: true, title: true } } },
      orderBy: { occurredAt: "asc" },
    });

    const header = [
      "project_title",
      "project_id",
      "credit_role",
      "credit_role_label",
      "description",
      "occurred_at",
    ].join(",");

    const rows = contributions.map((c) =>
      [
        escapeCSV(c.project.title),
        escapeCSV(c.project.id),
        escapeCSV(c.role),
        escapeCSV(CREDIT_LABELS[c.role as unknown as CreditRole] ?? c.role),
        escapeCSV(c.description),
        escapeCSV(c.occurredAt.toISOString()),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="credit-contributions-${userId}.csv"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
