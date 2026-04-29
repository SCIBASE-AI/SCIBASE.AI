import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";
import { getLeaderboard } from "@/services/reputation.service";

const LeaderboardQuerySchema = z.object({
  domain: z.string().optional(),
  region: z.string().optional(),
  institution: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = LeaderboardQuerySchema.parse(Object.fromEntries(searchParams));
    const entries = await getLeaderboard(prisma, query, query.limit);
    return NextResponse.json(entries);
  } catch (e) {
    return handleError(e);
  }
}
