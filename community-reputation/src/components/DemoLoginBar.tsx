"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

const DEMO_USERS = [
  { email: "alice.chen@mit.edu",        name: "Alice Chen",     label: "Alice Chen — Admin · MIT · Biology" },
  { email: "bob.mehta@stanford.edu",    name: "Bob Mehta",      label: "Bob Mehta — Stanford · Physics" },
  { email: "claire.dupont@oxford.ac.uk", name: "Claire Dupont", label: "Claire Dupont — Oxford · Social Sciences" },
  { email: "diana.osei@harvard.edu",    name: "Diana Osei",     label: "Diana Osei — Harvard · Biology" },
];

export function DemoLoginBar() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const switchUser = async (email: string) => {
    setLoading(true);
    await signIn("demo", { email, redirect: false });
    // Force a full page reload so server components re-render with the new session.
    window.location.reload();
  };

  if (status === "loading") return null;

  return (
    <div
      style={{
        background: "rgba(108,142,245,0.08)",
        borderBottom: "1px solid rgba(108,142,245,0.25)",
        padding: "0.4rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--accent)" }}>DEMO</span>

      {session?.user ? (
        <>
          <span>
            Signed in as{" "}
            <a href={`/users/${session.user.id}`} style={{ fontWeight: 600, color: "var(--text)" }}>
              {session.user.name}
            </a>
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Switch user:</span>
            <select
              value={session.user.email ?? ""}
              onChange={(e) => switchUser(e.target.value)}
              disabled={loading}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {DEMO_USERS.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                borderRadius: "4px",
                padding: "0.2rem 0.6rem",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </span>
        </>
      ) : (
        <>
          <span>Not signed in — pick a demo user to explore posting and reviewing:</span>
          <span style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginLeft: "auto" }}>
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => switchUser(u.email)}
                disabled={loading}
                style={{
                  background: u.email === "alice.chen@mit.edu" ? "var(--accent)" : "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: u.email === "alice.chen@mit.edu" ? "#fff" : "var(--text)",
                  borderRadius: "4px",
                  padding: "0.2rem 0.65rem",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontWeight: u.email === "alice.chen@mit.edu" ? 700 : 400,
                }}
              >
                {u.name}
                {u.email === "alice.chen@mit.edu" && " ★"}
              </button>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
