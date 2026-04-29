"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  projectId: string;
  onSubmitted?: () => void;
}

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public — reviewer identity visible to all" },
  { value: "SEMI_PRIVATE", label: "Semi-private — visible to project authors only" },
  { value: "ANONYMOUS", label: "Anonymous — content visible, identity hidden" },
  { value: "DOUBLE_BLIND", label: "Double-blind — full anonymity both ways" },
];

export function ReviewForm({ projectId, onSubmitted }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [scores, setScores] = useState({ clarity: 3, rigor: 3, novelty: 3, reproducibility: 3 });
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (asDraft: boolean) => {
    if (!content.trim()) {
      setErrorMsg("Review content is required.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          content,
          visibility,
          status: asDraft ? "DRAFT" : "PUBLISHED",
          ...scores,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = res.status === 401
          ? (body?.error ?? "Session expired — please sign out and sign in again")
          : (body?.error ?? `HTTP ${res.status}`);
        throw new Error(msg);
      }
      setContent("");
      setVisibility("PUBLIC");
      setScores({ clarity: 3, rigor: 3, novelty: 3, reproducibility: 3 });
      setStatus("done");
      onSubmitted?.();
      router.refresh();
      // Clear the success banner after 3 s so the form is ready for another review
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  if (status === "done") {
    return <div className="alert alert-success">Review submitted. Thank you!</div>;
  }

  const setScore = (k: keyof typeof scores, v: number) =>
    setScores((s) => ({ ...s, [k]: v }));

  return (
    <div className="form">
      {status === "error" && <div className="alert alert-error">{errorMsg}</div>}

      <div className="form-group">
        <label>Review</label>
        <textarea
          rows={5}
          placeholder="Share your assessment of this work…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Visibility</label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Scores (1–5)</label>
        <div className="score-grid">
          {(["clarity", "rigor", "novelty", "reproducibility"] as const).map((k) => (
            <div key={k} className="form-group">
              <label style={{ textTransform: "capitalize" }}>{k}</label>
              <select
                value={scores[k]}
                onChange={(e) => setScore(k, Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          className="btn btn-primary"
          onClick={() => submit(false)}
          disabled={status === "saving"}
        >
          {status === "saving" ? "Submitting…" : "Submit review"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => submit(true)}
          disabled={status === "saving"}
        >
          Save draft
        </button>
      </div>
    </div>
  );
}
