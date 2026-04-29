import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/services/reputation.service";
import { ReputationBadge } from "@/components/ReputationBadge";
import { LeaderboardFilters } from "@/components/LeaderboardFilters";

interface PageProps {
  searchParams: { domain?: string; region?: string; institution?: string; limit?: string };
}

async function LeaderboardTable({ searchParams }: PageProps) {
  const limit = Math.min(parseInt(searchParams.limit ?? "50", 10) || 50, 100);
  const entries = await getLeaderboard(
    prisma,
    {
      domain: searchParams.domain || undefined,
      region: searchParams.region || undefined,
      institution: searchParams.institution || undefined,
    },
    limit
  );

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        No users match these filters — or no reputation snapshots have been computed yet.
        <br />
        <span style={{ fontSize: "0.8rem", marginTop: "0.4rem", display: "block" }}>
          Run <code>./dev.sh --demo</code> to seed sample data.
        </span>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Researcher</th>
            <th>Institution</th>
            <th>Domain</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={entry.id}>
              <td className={`rank-cell${i < 3 ? " top-3" : ""}`}>{i + 1}</td>
              <td>
                <a href={`/users/${entry.id}`} style={{ fontWeight: 500 }}>
                  {entry.name ?? "Anonymous"}
                </a>
              </td>
              <td>
                <span className="tag-pill">{entry.institution ?? "—"}</span>
              </td>
              <td>
                <span className="tag-pill">{entry.domain ?? "—"}</span>
              </td>
              <td className="score-cell">
                <ReputationBadge total={entry.total} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeaderboardPage({ searchParams }: PageProps) {
  const hasFilter = searchParams.domain || searchParams.region || searchParams.institution;
  return (
    <>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-subtitle">
        Researchers ranked by reputation score
        {hasFilter ? " — filtered view" : ""}
      </p>

      <Suspense fallback={null}>
        <LeaderboardFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="empty-state">Loading…</div>
        }
      >
        <LeaderboardTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}
