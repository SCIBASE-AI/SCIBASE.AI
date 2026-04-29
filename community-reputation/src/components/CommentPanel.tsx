"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface CommentAuthor {
  id: string;
  name: string | null;
}

interface Comment {
  id: string;
  body: string;
  authorId: string;
  author: CommentAuthor;
  parentId: string | null;
  createdAt: string;
  replies?: Comment[];
}

interface Props {
  targetId: string;
  targetType?: string;
  initialCount?: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply: (parentId: string, body: string) => Promise<void>;
}) {
  const { data: session } = useSession();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setSaving(true);
    await onReply(comment.id, replyBody.trim());
    setReplyBody("");
    setReplyOpen(false);
    setSaving(false);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
          padding: "0.5rem 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {(comment.author.name ?? "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", marginBottom: "0.15rem" }}>
            <a
              href={`/users/${comment.authorId}`}
              style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text)" }}
            >
              {comment.author.name ?? "Anonymous"}
            </a>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.55, color: "var(--text)" }}>{comment.body}</p>
          {session && (
            <button
              onClick={() => setReplyOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                cursor: "pointer",
                marginTop: "0.2rem",
                padding: 0,
              }}
            >
              Reply
            </button>
          )}
          {replyOpen && (
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem" }}>
              <textarea
                rows={2}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                style={{
                  flex: 1,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: "4px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <button
                className="btn btn-primary"
                onClick={submitReply}
                disabled={saving || !replyBody.trim()}
                style={{ alignSelf: "flex-end", padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
              >
                {saving ? "…" : "Post"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ paddingLeft: "2.2rem" }}>
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentPanel({ targetId, targetType = "REVIEW", initialCount = 0 }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
    );
    if (!res.ok) return;
    const flat: Comment[] = await res.json();
    // Thread replies under parents
    const byId = new Map(flat.map((c) => ({ ...c, replies: [] } as Comment)).map((c) => [c.id, c]));
    const roots: Comment[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies!.push(c);
      } else {
        roots.push(c);
      }
    }
    setComments(roots);
    setLoaded(true);
  }, [targetId, targetType]);

  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  const postComment = async (parentId: string | null, body: string) => {
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, targetType, targetId, parentId }),
    });
    await load();
  };

  const submit = async () => {
    if (!newBody.trim()) return;
    setSaving(true);
    await postComment(null, newBody.trim());
    setNewBody("");
    setSaving(false);
  };

  const totalVisible = loaded ? comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0) : initialCount;

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          fontSize: "0.78rem",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
      >
        <span>💬</span>
        {open ? "Hide" : `${totalVisible > 0 ? totalVisible : "No"} comment${totalVisible !== 1 ? "s" : ""}`}
      </button>

      {open && (
        <div style={{ marginTop: "0.6rem" }}>
          {loaded && comments.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
              No comments yet. Be the first.
            </p>
          )}

          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={(pid, body) => postComment(pid, body)} />
          ))}

          {session ? (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", alignItems: "flex-end" }}>
              <textarea
                rows={2}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={`Comment as ${session.user.name}…`}
                style={{
                  flex: 1,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: "4px",
                  padding: "0.45rem 0.65rem",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={saving || !newBody.trim()}
                style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
              >
                {saving ? "…" : "Post"}
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.5rem" }}>
              <a href="/auth/signin">Sign in</a> to comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
