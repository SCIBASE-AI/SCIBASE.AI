"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const DEMO_USERS = [
  { email: "alice.chen@mit.edu",         name: "Alice Chen",     role: "Admin · MIT · Biology",           admin: true },
  { email: "bob.mehta@stanford.edu",     name: "Bob Mehta",      role: "Stanford · Physics" },
  { email: "claire.dupont@oxford.ac.uk", name: "Claire Dupont",  role: "Oxford · Social Sciences" },
  { email: "diana.osei@harvard.edu",     name: "Diana Osei",     role: "Harvard · Biology" },
];

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const login = (email: string) =>
    signIn("demo", { email, callbackUrl });

  return (
    <div style={{ maxWidth: "420px", margin: "4rem auto" }}>
      <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>Sign in</h1>
      <p className="page-subtitle">Choose a demo account to explore the platform.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1.5rem" }}>
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            onClick={() => login(u.email)}
            className={`btn ${u.admin ? "btn-primary" : "btn-secondary"}`}
            style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "0.7rem 1rem" }}
          >
            <span style={{ fontSize: "1.1rem" }}>{u.admin ? "★" : "○"}</span>
            <span>
              <span style={{ fontWeight: 700 }}>{u.name}</span>
              <span style={{ marginLeft: "0.5rem", opacity: 0.65, fontSize: "0.8rem" }}>{u.role}</span>
            </span>
          </button>
        ))}
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
        GitHub OAuth is configured separately for production. These accounts are for demo only.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
