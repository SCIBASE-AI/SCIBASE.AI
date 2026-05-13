import http from "node:http";
import {
  buildCommunityDashboard,
  buildContributorGraph,
  buildLeaderboard,
  buildPeerReview,
  buildProjectTimeline,
  createInlineComment
} from "./reputation.js";
import { sampleComments, sampleContributions, sampleProject, sampleReviews, sampleUsers } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4324", 10);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const dashboard = buildCommunityDashboard({
    users: sampleUsers,
    project: sampleProject,
    reviews: sampleReviews,
    comments: sampleComments,
    contributions: sampleContributions
  });
  const leaders = dashboard.leaderboard.map((user) => `<li>${user.name}: ${user.score} (${user.badges.join(", ")})</li>`).join("");
  const timeline = dashboard.timeline.slice(-5).map((event) => `<li>${event.at}: ${event.type} by ${event.actorId}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Community Reputation Ledger</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fb; color: #18202a; }
    main { max-width: 1060px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 0 0 12px; letter-spacing: 0; }
    p { color: #536172; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .panel { background: white; border: 1px solid #dfe4ec; border-radius: 8px; padding: 18px; }
    strong { display: block; font-size: 30px; margin-top: 8px; }
    li { margin-bottom: 10px; }
    code { background: #edf1f6; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI community milestone</p>
    <h1>Community Reputation Ledger</h1>
    <p>${sampleProject.title}. Endpoints: <code>/api/reviews</code>, <code>/api/comments</code>, <code>/api/contributions</code>, <code>/api/reputation</code>, <code>/api/leaderboard</code>, <code>/api/timeline</code>.</p>
    <section class="grid">
      <div class="panel">Reviews<strong>${dashboard.summary.reviewCount}</strong></div>
      <div class="panel">Contributors<strong>${dashboard.summary.contributorCount}</strong></div>
      <div class="panel">Top score<strong>${dashboard.summary.topReputationScore}</strong></div>
    </section>
    <section class="grid">
      <div class="panel"><h2>Leaderboard</h2><ul>${leaders}</ul></div>
      <div class="panel"><h2>Timeline</h2><ul>${timeline}</ul></div>
      <div class="panel"><h2>Graph</h2><p>${dashboard.contributorGraph.nodes.length} nodes, ${dashboard.contributorGraph.edges.length} edges</p></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/reviews") return json(response, sampleReviews.map(buildPeerReview));
  if (url.pathname === "/api/comments") return json(response, sampleComments.map(createInlineComment));
  if (url.pathname === "/api/contributions") return json(response, buildContributorGraph(sampleContributions));
  if (url.pathname === "/api/reputation") return json(response, buildLeaderboard(sampleUsers, sampleContributions));
  if (url.pathname === "/api/leaderboard") return json(response, buildLeaderboard(sampleUsers, sampleContributions, { domain: sampleProject.domain }));
  if (url.pathname === "/api/timeline") {
    return json(response, buildProjectTimeline({ reviews: sampleReviews, comments: sampleComments, contributions: sampleContributions }));
  }
  if (url.pathname === "/api/dashboard") {
    return json(response, buildCommunityDashboard({ users: sampleUsers, project: sampleProject, reviews: sampleReviews, comments: sampleComments, contributions: sampleContributions }));
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Community Reputation Ledger running at http://localhost:${port}`);
});
