#!/usr/bin/env python3
"""Trace AI executive summary claims back to manuscript evidence."""

from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


OVERBROAD_RE = re.compile(r"\b(all|always|never|eliminate|guarantee|prove|definitive|across every)\b", re.I)
CLINICAL_RE = re.compile(r"\b(clinical|patient|treatment|diagnosis|therapy|medical)\b", re.I)
POLICY_RE = re.compile(r"\b(policy|funder|mandate|regulator|government|compliance)\b", re.I)
NUMBER_RE = re.compile(r"\b\d+(?:\.\d+)?%?\b")
TOKEN_RE = re.compile(r"[a-z][a-z0-9-]{2,}", re.I)
VALID_MODES = {"key_finding", "implication", "next_step"}
FINDING_EVIDENCE = {"result", "figure", "table", "method"}
SENSITIVE_EVIDENCE = {"clinical_trial", "ethics", "policy", "limitation", "method"}
STOPWORDS = {
    "about",
    "after",
    "also",
    "and",
    "are",
    "because",
    "before",
    "can",
    "could",
    "for",
    "from",
    "has",
    "have",
    "into",
    "may",
    "now",
    "our",
    "should",
    "shows",
    "that",
    "the",
    "these",
    "this",
    "was",
    "were",
    "will",
    "with",
}


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {"code": self.code, "severity": self.severity, "message": self.message}


@dataclass
class BulletReview:
    bullet_id: str
    mode: str
    decision: str
    findings: list[Finding] = field(default_factory=list)
    evidence_trace: list[dict[str, str]] = field(default_factory=list)
    rewrite: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "bullet_id": self.bullet_id,
            "mode": self.mode,
            "decision": self.decision,
            "findings": [finding.to_dict() for finding in self.findings],
            "evidence_trace": self.evidence_trace,
            "rewrite": self.rewrite,
        }


def sample_path() -> Path:
    return Path(__file__).with_name("sample_summary_packet.json")


def load_packet(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        packet = json.load(handle)
    if not isinstance(packet, dict):
        raise ValueError("Summary packet must be a JSON object.")
    return packet


def review_packet(packet: dict[str, Any]) -> dict[str, Any]:
    evidence_index = {
        str(item.get("id")): item
        for item in packet.get("evidence", [])
        if isinstance(item, dict) and item.get("id")
    }
    reviews = [review_bullet(bullet, evidence_index) for bullet in packet.get("summary_bullets", [])]
    summary = {
        "total": len(reviews),
        "publish": sum(1 for review in reviews if review.decision == "publish"),
        "revise": sum(1 for review in reviews if review.decision == "revise"),
        "block": sum(1 for review in reviews if review.decision == "block"),
        "trace_count": sum(len(review.evidence_trace) for review in reviews),
    }
    return {
        "assistant": "executive-summary-claim-trace-assistant",
        "manuscript_id": packet.get("manuscript_id", "unknown"),
        "summary": summary,
        "bullet_reviews": [review.to_dict() for review in reviews],
    }


def review_bullet(bullet: dict[str, Any], evidence_index: dict[str, dict[str, Any]]) -> BulletReview:
    bullet_id = str(bullet.get("id") or "UNKNOWN")
    mode = str(bullet.get("mode") or "")
    text = str(bullet.get("text") or "")
    evidence_ids = [str(item) for item in bullet.get("evidence_ids") or []]
    findings: list[Finding] = []
    trace: list[dict[str, str]] = []
    evidence_texts: list[str] = []
    evidence_numbers: set[str] = set()

    if mode not in VALID_MODES:
        findings.append(Finding("UNKNOWN_SUMMARY_MODE", "revise", "Summary bullet mode is not recognized."))

    if not text.strip():
        findings.append(Finding("EMPTY_SUMMARY_BULLET", "block", "Summary bullet has no text."))

    if not evidence_ids:
        findings.append(Finding("MISSING_EVIDENCE_TRACE", "block", "Summary bullet has no source evidence IDs."))

    missing = []
    evidence_types = set()
    for evidence_id in evidence_ids:
        evidence = evidence_index.get(evidence_id)
        if not evidence:
            missing.append(evidence_id)
            continue
        evidence_type = str(evidence.get("type") or "unknown")
        evidence_types.add(evidence_type)
        evidence_text = str(evidence.get("text") or "")
        evidence_texts.append(evidence_text)
        evidence_numbers.update(extract_numbers(evidence_text))
        metrics = evidence.get("metrics")
        if isinstance(metrics, dict):
            evidence_numbers.update(normalize_number(value) for value in metrics.values())
        trace.append(
            {
                "evidence_id": evidence_id,
                "type": evidence_type,
                "section": str(evidence.get("section") or ""),
            }
        )

    if missing:
        findings.append(
            Finding(
                "UNKNOWN_EVIDENCE_ID",
                "block",
                "Summary references evidence IDs that are absent from the packet: " + ", ".join(missing),
            )
        )

    if mode == "key_finding" and trace and not evidence_types.intersection(FINDING_EVIDENCE):
        findings.append(
            Finding("WEAK_KEY_FINDING_SUPPORT", "revise", "Key finding lacks result, table, figure, or method support.")
        )

    if trace and mode == "key_finding" and weak_text_overlap(text, evidence_texts):
        findings.append(
            Finding(
                "LOW_EVIDENCE_TEXT_OVERLAP",
                "revise",
                "Key finding shares too little terminology with the traced evidence.",
            )
        )

    unsupported_numbers = sorted(extract_numbers(text) - evidence_numbers)
    if trace and unsupported_numbers:
        findings.append(
            Finding(
                "UNSUPPORTED_NUMERIC_DETAIL",
                "revise",
                "Summary includes numeric details absent from traced evidence: " + ", ".join(unsupported_numbers),
            )
        )

    if OVERBROAD_RE.search(text):
        findings.append(
            Finding("OVERBROAD_LANGUAGE", "revise", "Summary uses universal or definitive language beyond the evidence.")
        )

    if CLINICAL_RE.search(text) and not evidence_types.intersection(SENSITIVE_EVIDENCE):
        findings.append(
            Finding("CLINICAL_CLAIM_NEEDS_SAFETY_CONTEXT", "revise", "Clinical claims need methods, ethics, trial, or limitation evidence.")
        )

    if POLICY_RE.search(text) and "policy" not in evidence_types:
        findings.append(
            Finding("POLICY_CLAIM_NEEDS_POLICY_EVIDENCE", "revise", "Policy or funder claims need policy evidence.")
        )

    decision = decision_from_findings(findings)
    return BulletReview(
        bullet_id=bullet_id,
        mode=mode,
        decision=decision,
        findings=findings,
        evidence_trace=trace,
        rewrite=suggest_rewrite(text, findings),
    )


def normalize_number(value: Any) -> str:
    return str(value).strip().lower().rstrip("%.,")


def extract_numbers(text: str) -> set[str]:
    return {normalize_number(match.group(0)) for match in NUMBER_RE.finditer(text)}


def normalized_tokens(text: str) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(text) if token.lower() not in STOPWORDS}


def weak_text_overlap(summary_text: str, evidence_texts: list[str]) -> bool:
    claim_tokens = normalized_tokens(summary_text)
    if len(claim_tokens) < 5:
        return False
    evidence_tokens = normalized_tokens(" ".join(evidence_texts))
    return len(claim_tokens.intersection(evidence_tokens)) < 2


def decision_from_findings(findings: Iterable[Finding]) -> str:
    severities = {finding.severity for finding in findings}
    if "block" in severities:
        return "block"
    if "revise" in severities:
        return "revise"
    return "publish"


def suggest_rewrite(text: str, findings: list[Finding]) -> str:
    codes = {finding.code for finding in findings}
    if not findings:
        return ""
    if "MISSING_EVIDENCE_TRACE" in codes or "UNKNOWN_EVIDENCE_ID" in codes:
        return "Hold this bullet until the source evidence IDs are added or corrected."
    if "UNSUPPORTED_NUMERIC_DETAIL" in codes:
        return "Replace unsupported numbers with the exact values in the traced evidence or remove the numeric detail."
    revised = text
    revised = re.sub(r"\bwill eliminate\b", "may reduce", revised, flags=re.I)
    revised = re.sub(r"\ball\b", "similar", revised, flags=re.I)
    revised = re.sub(r"\bshould now be deployed\b", "could be evaluated", revised, flags=re.I)
    if revised == text:
        revised = "Revise to state the claim with narrower scope and cite the supporting evidence."
    return revised


def write_json(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_markdown(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    lines = [
        "# Executive Summary Claim Trace Report",
        "",
        f"- Manuscript: {report['manuscript_id']}",
        f"- Total bullets: {summary['total']}",
        f"- Publish: {summary['publish']}",
        f"- Revise: {summary['revise']}",
        f"- Block: {summary['block']}",
        f"- Evidence traces: {summary['trace_count']}",
        "",
        "| Bullet | Decision | Findings | Rewrite |",
        "| --- | --- | --- | --- |",
    ]
    for review in report["bullet_reviews"]:
        findings = ", ".join(finding["code"] for finding in review["findings"]) or "none"
        rewrite = review["rewrite"] or ""
        lines.append(f"| {review['bullet_id']} | {review['decision']} | {findings} | {rewrite} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_svg(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    bars = [("publish", "#2f855a", summary["publish"]), ("revise", "#b7791f", summary["revise"]), ("block", "#c53030", summary["block"])]
    max_count = max([count for _, _, count in bars] + [1])
    rows = []
    for index, (label, color, count) in enumerate(bars):
        y = 82 + index * 58
        width = int(300 * count / max_count)
        rows.append(f'<text x="32" y="{y + 20}" font-size="15" fill="#1a202c">{html.escape(label)}</text>')
        rows.append(f'<rect x="130" y="{y}" width="{width}" height="30" rx="4" fill="{color}" />')
        rows.append(f'<text x="{142 + width}" y="{y + 20}" font-size="15" fill="#1a202c">{count}</text>')
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="560" height="300" viewBox="0 0 560 300" role="img" aria-label="Executive summary claim trace report">
  <rect width="560" height="300" fill="#f8fafc"/>
  <text x="32" y="42" font-size="22" font-family="Arial, sans-serif" fill="#1a202c">Executive Summary Claim Trace</text>
  <text x="32" y="64" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Evidence coverage for AI-generated summary bullets</text>
  {''.join(rows)}
  <text x="32" y="270" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Evidence traces: {summary['trace_count']}</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--input", type=Path)
    group.add_argument("--sample", action="store_true")
    parser.add_argument("--json", type=Path)
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--svg", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    packet = load_packet(sample_path() if args.sample else args.input)
    report = review_packet(packet)
    if args.json:
        write_json(report, args.json)
    if args.markdown:
        write_markdown(report, args.markdown)
    if args.svg:
        write_svg(report, args.svg)
    summary = report["summary"]
    print(f"Executive summary trace: {summary['publish']} publish, {summary['revise']} revise, {summary['block']} block.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
