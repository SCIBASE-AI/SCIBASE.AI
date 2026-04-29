export default function Home() {
  return (
    <>
      <h1 className="page-title">SCIBASE Community &amp; Reputation</h1>
      <p className="page-subtitle">
        Transparent credit, peer review, and reputation for open science.
      </p>

      <div className="grid-2">
        <a href="/leaderboard" className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏆</div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>Leaderboard</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Researchers ranked by reputation score. Filter by domain, region, or institution.
          </p>
        </a>

        <div className="card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📡</div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>REST API</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            All data is available via the JSON API. See{" "}
            <a href="/api/leaderboards">/api/leaderboards</a>,{" "}
            <a href="/api/reviews">/api/reviews</a>, and more.
          </p>
        </div>
      </div>

      <div className="divider" />

      <h2 className="section-heading">Quick links (demo data)</h2>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.875rem" }}>
        <li><a href="/projects/demo-project-alice">CRISPR off-target effects in human stem cells</a></li>
        <li><a href="/projects/demo-project-bob">Topological insulators at room temperature</a></li>
        <li><a href="/projects/demo-project-claire">Social media echo chambers and political polarisation</a></li>
      </ul>
    </>
  );
}
