"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const DOMAINS = [
  { value: "", label: "All domains" },
  { value: "biology", label: "Biology" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "social_sciences", label: "Social Sciences" },
  { value: "computer_science", label: "Computer Science" },
  { value: "medicine", label: "Medicine" },
  { value: "mathematics", label: "Mathematics" },
];

const REGIONS = [
  { value: "", label: "All regions" },
  { value: "us", label: "North America" },
  { value: "eu", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "other", label: "Other" },
];

export function LeaderboardFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      router.push(`/leaderboard?${next.toString()}`);
    },
    [router, params]
  );

  return (
    <div className="filter-bar">
      <select
        value={params.get("domain") ?? ""}
        onChange={(e) => set("domain", e.target.value)}
        aria-label="Filter by domain"
      >
        {DOMAINS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <select
        value={params.get("region") ?? ""}
        onChange={(e) => set("region", e.target.value)}
        aria-label="Filter by region"
      >
        {REGIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Institution…"
        value={params.get("institution") ?? ""}
        onChange={(e) => set("institution", e.target.value)}
        aria-label="Filter by institution"
        style={{ minWidth: "160px" }}
      />
    </div>
  );
}
