"use client";

import { useState } from "react";

interface Props {
  endorseeId: string;
}

export function EndorseButton({ endorseeId }: Props) {
  const [open, setOpen] = useState(false);
  const [skill, setSkill] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!skill.trim()) {
      setMsg("Please enter a skill.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endorseeId, skill: skill.trim(), note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setStatus("done");
      setMsg("Endorsement recorded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  if (status === "done") {
    return <span className="alert alert-success" style={{ padding: "0.25rem 0.75rem" }}>{msg}</span>;
  }

  if (!open) {
    return (
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        + Endorse
      </button>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "360px" }}>
      {status === "error" && <div className="alert alert-error" style={{ marginBottom: "0.75rem" }}>{msg}</div>}
      <div className="form-group" style={{ marginBottom: "0.6rem" }}>
        <label>Skill</label>
        <input
          type="text"
          placeholder="e.g. reproducibility, data-analysis"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />
      </div>
      <div className="form-group" style={{ marginBottom: "0.75rem" }}>
        <label>Note (optional)</label>
        <input
          type="text"
          placeholder="Brief note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" onClick={submit} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Endorse"}
        </button>
        <button className="btn btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
