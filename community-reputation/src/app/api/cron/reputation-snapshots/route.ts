import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeSnapshot } from "@/services/reputation.service";

// Triggered by Vercel Cron or any scheduler via:
//   GET /api/cron/reputation-snapshots
//   Header: x-cron-secret: <CRON_SECRET>
//
// Writes a ReputationSnapshot row per active user and awards any newly
// unlocked badges. Safe to re-run — snapshots are append-only.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  const results = await Promise.allSettled(users.map((u) => writeSnapshot(prisma, u.id)));

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message ?? "unknown");

  return NextResponse.json({ succeeded, failedCount: failed.length, errors: failed });
}
