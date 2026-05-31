#!/usr/bin/env python3
"""Guard scientific image metadata before Knowledge Graph publication."""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


CHECKSUM_RE = re.compile(r"^[0-9a-fA-F]{64}$")
PRIVATE_FIELD_RE = re.compile(
    r"(patient|mrn|medical_record|dob|date_of_birth|email|phone|ssn|address)",
    re.IGNORECASE,
)
PRIVATE_VALUE_RE = re.compile(
    r"(MRN[_ -]?\d{4,}|\b\d{3}-\d{2}-\d{4}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})",
    re.IGNORECASE,
)
MICROSCOPY_MODALITIES = {
    "confocal_microscopy",
    "fluorescence_microscopy",
    "widefield_microscopy",
    "electron_microscopy",
    "microscopy",
}
NON_PUBLIC_ACCESS = {"private", "restricted", "embargoed", "confidential"}
OPEN_LICENSE_PREFIXES = ("CC-", "MIT", "BSD", "Apache", "ODC-")


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str
    message: str
    field: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data = {
            "code": self.code,
            "severity": self.severity,
            "message": self.message,
        }
        if self.field:
            data["field"] = self.field
        return data


@dataclass(frozen=True)
class GraphEdge:
    subject: str
    predicate: str
    object: str
    visibility: str = "public"
    evidence: str = "metadata"

    def to_dict(self) -> dict[str, str]:
        return {
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.object,
            "visibility": self.visibility,
            "evidence": self.evidence,
        }


@dataclass
class GuardResult:
    image_id: str
    title: str
    decision: str
    release_scope: str
    findings: list[Finding] = field(default_factory=list)
    redactions: list[dict[str, str]] = field(default_factory=list)
    safe_edges: list[GraphEdge] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "image_id": self.image_id,
            "title": self.title,
            "decision": self.decision,
            "release_scope": self.release_scope,
            "findings": [finding.to_dict() for finding in self.findings],
            "redactions": self.redactions,
            "safe_edges": [edge.to_dict() for edge in self.safe_edges],
        }


def _parse_date(value: Any) -> dt.date | None:
    if not value:
        return None
    if isinstance(value, dt.date):
        return value
    try:
        return dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True)
    return str(value)


def _contains_private_value(value: Any) -> bool:
    text = _as_text(value)
    return bool(PRIVATE_VALUE_RE.search(text))


def _field_has_private_name(field_name: str) -> bool:
    return bool(PRIVATE_FIELD_RE.search(field_name))


def _open_license(license_value: str) -> bool:
    normalized = license_value.strip()
    return bool(normalized) and normalized.startswith(OPEN_LICENSE_PREFIXES)


def evaluate_record(record: dict[str, Any]) -> GuardResult:
    """Evaluate one image metadata record and return a KG publication decision."""

    image_id = str(record.get("image_id") or "UNKNOWN")
    title = str(record.get("title") or image_id)
    modality = str(record.get("modality") or "").strip().lower()
    image_kind = str(record.get("image_kind") or "raw_image").strip().lower()
    source_artifact = str(record.get("source_artifact") or "").strip()
    dataset_id = str(record.get("dataset_id") or "").strip()
    protocol_id = str(record.get("protocol_id") or "").strip()
    instrument_id = str(record.get("instrument_id") or "").strip()
    access = str(record.get("access") or "public").strip().lower()
    license_value = str(record.get("license") or "").strip()
    filename = str(record.get("filename") or "").strip()
    channels = record.get("channels") or []
    pixel_size = record.get("pixel_size_um")
    derived_from = record.get("derived_from") or []
    metadata = record.get("metadata") or {}
    privacy_tags = [str(tag).lower() for tag in record.get("privacy_tags") or []]
    findings: list[Finding] = []
    redactions: list[dict[str, str]] = []

    if not image_id or image_id == "UNKNOWN":
        findings.append(
            Finding("MISSING_IMAGE_ID", "block", "Image node is missing a stable image_id.", "image_id")
        )

    checksum = str(record.get("sha256") or "").strip()
    if not CHECKSUM_RE.match(checksum):
        findings.append(
            Finding(
                "INVALID_CHECKSUM",
                "block",
                "Image checksum must be a 64-character SHA-256 hex digest.",
                "sha256",
            )
        )

    if not dataset_id:
        findings.append(
            Finding("MISSING_DATASET", "review", "Image has no dataset node for KG membership.", "dataset_id")
        )

    if not protocol_id:
        findings.append(
            Finding("MISSING_PROTOCOL", "review", "Image has no protocol node for provenance.", "protocol_id")
        )

    if image_kind == "derived_figure":
        if not derived_from and not source_artifact:
            findings.append(
                Finding(
                    "MISSING_DERIVED_SOURCE",
                    "block",
                    "Derived figure cannot enter the KG without source image or artifact lineage.",
                    "derived_from",
                )
            )
    elif not source_artifact:
        findings.append(
            Finding(
                "MISSING_SOURCE_ARTIFACT",
                "review",
                "Raw image has no source artifact location for provenance audit.",
                "source_artifact",
            )
        )

    acquired_at = _parse_date(record.get("acquired_at"))
    publication_date = _parse_date(record.get("publication_date"))
    if acquired_at is None:
        findings.append(
            Finding("MISSING_ACQUISITION_DATE", "review", "Image has no parseable acquisition date.", "acquired_at")
        )
    if publication_date is None:
        findings.append(
            Finding("MISSING_PUBLICATION_DATE", "review", "Image has no parseable publication date.", "publication_date")
        )
    if acquired_at and publication_date and acquired_at > publication_date:
        findings.append(
            Finding(
                "ACQUIRED_AFTER_PUBLICATION",
                "block",
                "Image acquisition date is later than the publication date.",
                "acquired_at",
            )
        )

    if modality in MICROSCOPY_MODALITIES:
        if not isinstance(channels, list) or not channels:
            findings.append(
                Finding(
                    "MISSING_CHANNELS",
                    "review",
                    "Microscopy image should include channel metadata before KG recommendation use.",
                    "channels",
                )
            )
        if pixel_size in (None, ""):
            findings.append(
                Finding(
                    "MISSING_PIXEL_SIZE",
                    "review",
                    "Microscopy image should include pixel_size_um for scale-aware graph navigation.",
                    "pixel_size_um",
                )
            )
        elif not isinstance(pixel_size, (int, float)) or pixel_size <= 0:
            findings.append(
                Finding(
                    "INVALID_PIXEL_SIZE",
                    "review",
                    "pixel_size_um must be a positive number.",
                    "pixel_size_um",
                )
            )

    if access in NON_PUBLIC_ACCESS:
        findings.append(
            Finding(
                "NON_PUBLIC_ACCESS",
                "review",
                "Image is not public and should be kept out of the public KG release.",
                "access",
            )
        )

    if not _open_license(license_value):
        findings.append(
            Finding(
                "LICENSE_REVIEW_REQUIRED",
                "review",
                "Image license is missing or not clearly open for graph publication.",
                "license",
            )
        )

    if any(tag in {"phi", "pii", "private_identifier", "patient_identifier"} for tag in privacy_tags):
        findings.append(
            Finding(
                "PRIVATE_TAG_PRESENT",
                "block",
                "Privacy tags indicate private identifiers that must not enter public KG nodes.",
                "privacy_tags",
            )
        )
        redactions.append({"field": "privacy_tags", "action": "remove from public graph payload"})

    if _contains_private_value(filename):
        findings.append(
            Finding(
                "PRIVATE_VALUE_IN_FILENAME",
                "block",
                "Filename appears to contain private identifiers.",
                "filename",
            )
        )
        redactions.append({"field": "filename", "action": "replace with stable image_id"})

    if isinstance(metadata, dict):
        for key, value in sorted(metadata.items()):
            if _field_has_private_name(str(key)) or _contains_private_value(value):
                findings.append(
                    Finding(
                        "PRIVATE_METADATA_FIELD",
                        "block",
                        "Metadata contains a private field name or value.",
                        f"metadata.{key}",
                    )
                )
                redactions.append({"field": f"metadata.{key}", "action": "drop before KG release"})

    decision = _decision_from_findings(findings)
    release_scope = _release_scope(decision, access)
    safe_edges = _build_safe_edges(
        image_id=image_id,
        dataset_id=dataset_id,
        protocol_id=protocol_id,
        instrument_id=instrument_id,
        source_artifact=source_artifact,
        license_value=license_value,
        derived_from=derived_from,
        release_scope=release_scope,
        allow_public=decision == "publish",
    )

    return GuardResult(
        image_id=image_id,
        title=title,
        decision=decision,
        release_scope=release_scope,
        findings=findings,
        redactions=redactions,
        safe_edges=safe_edges,
    )


def _decision_from_findings(findings: Iterable[Finding]) -> str:
    severities = {finding.severity for finding in findings}
    if "block" in severities:
        return "block"
    if "review" in severities:
        return "review"
    return "publish"


def _release_scope(decision: str, access: str) -> str:
    if decision == "block":
        return "do_not_publish"
    if access in NON_PUBLIC_ACCESS:
        return "internal_review_only"
    if decision == "review":
        return "review_queue"
    return "public_kg"


def _build_safe_edges(
    *,
    image_id: str,
    dataset_id: str,
    protocol_id: str,
    instrument_id: str,
    source_artifact: str,
    license_value: str,
    derived_from: list[Any],
    release_scope: str,
    allow_public: bool,
) -> list[GraphEdge]:
    visibility = "public" if allow_public and release_scope == "public_kg" else "internal"
    image_node = f"image:{image_id}"
    edges: list[GraphEdge] = []

    if dataset_id:
        edges.append(GraphEdge(image_node, "member_of_dataset", f"dataset:{dataset_id}", visibility))
    if protocol_id:
        edges.append(GraphEdge(image_node, "uses_protocol", f"protocol:{protocol_id}", visibility))
    if instrument_id:
        edges.append(GraphEdge(image_node, "captured_by", f"instrument:{instrument_id}", visibility))
    if source_artifact:
        edges.append(GraphEdge(image_node, "has_source_artifact", f"artifact:{source_artifact}", visibility))
    if license_value:
        edges.append(GraphEdge(image_node, "released_under", f"license:{license_value}", visibility))
    for source in derived_from:
        source_text = str(source).strip()
        if source_text:
            edges.append(GraphEdge(image_node, "derived_from", f"image:{source_text}", visibility))
    return edges


def evaluate_records(records: Iterable[dict[str, Any]]) -> dict[str, Any]:
    results = [evaluate_record(record) for record in records]
    summary = {
        "total": len(results),
        "publish": sum(1 for result in results if result.decision == "publish"),
        "review": sum(1 for result in results if result.decision == "review"),
        "block": sum(1 for result in results if result.decision == "block"),
        "safe_edge_count": sum(len(result.safe_edges) for result in results),
        "redaction_count": sum(len(result.redactions) for result in results),
    }
    return {
        "guard": "scientific-image-metadata-provenance-guard",
        "summary": summary,
        "records": [result.to_dict() for result in results],
    }


def load_records(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        records = json.load(handle)
    if not isinstance(records, list):
        raise ValueError("Input JSON must contain a list of image metadata records.")
    return records


def sample_path() -> Path:
    return Path(__file__).with_name("sample_image_records.json")


def write_json(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_markdown(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    lines = [
        "# Scientific Image Metadata Provenance Guard Summary",
        "",
        f"- Total records: {summary['total']}",
        f"- Publish: {summary['publish']}",
        f"- Review: {summary['review']}",
        f"- Block: {summary['block']}",
        f"- Safe graph edges: {summary['safe_edge_count']}",
        f"- Redactions: {summary['redaction_count']}",
        "",
        "| Image | Decision | Release scope | Findings |",
        "| --- | --- | --- | --- |",
    ]
    for record in report["records"]:
        findings = ", ".join(finding["code"] for finding in record["findings"]) or "none"
        lines.append(
            "| {image} | {decision} | {scope} | {findings} |".format(
                image=record["image_id"],
                decision=record["decision"],
                scope=record["release_scope"],
                findings=findings,
            )
        )
    lines.extend(["", "## Reviewer Actions", ""])
    for record in report["records"]:
        if record["decision"] == "publish":
            continue
        lines.append(f"### {record['image_id']}")
        for finding in record["findings"]:
            lines.append(f"- {finding['severity'].upper()} {finding['code']}: {finding['message']}")
        for redaction in record["redactions"]:
            lines.append(f"- Redact `{redaction['field']}`: {redaction['action']}")
        lines.append("")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_svg(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    bars = [
        ("publish", "#2f855a", summary["publish"]),
        ("review", "#b7791f", summary["review"]),
        ("block", "#c53030", summary["block"]),
    ]
    max_count = max([count for _, _, count in bars] + [1])
    bar_markup = []
    for index, (label, color, count) in enumerate(bars):
        y = 80 + index * 58
        width = int(300 * count / max_count)
        bar_markup.append(
            f'<text x="36" y="{y + 20}" font-size="16" fill="#1a202c">{html.escape(label)}</text>'
        )
        bar_markup.append(
            f'<rect x="120" y="{y}" width="{width}" height="30" rx="4" fill="{color}" />'
        )
        bar_markup.append(
            f'<text x="{132 + width}" y="{y + 20}" font-size="15" fill="#1a202c">{count}</text>'
        )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="560" height="300" viewBox="0 0 560 300" role="img" aria-label="Scientific image metadata provenance guard summary">
  <rect width="560" height="300" fill="#f7fafc"/>
  <text x="36" y="42" font-size="22" font-family="Arial, sans-serif" fill="#1a202c">Image Metadata KG Guard</text>
  <text x="36" y="64" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Publication decisions for scientific image nodes</text>
  {''.join(bar_markup)}
  <text x="36" y="270" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Safe edges: {summary['safe_edge_count']} | Redactions: {summary['redaction_count']}</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--input", type=Path, help="Path to image metadata JSON records.")
    input_group.add_argument("--sample", action="store_true", help="Use the bundled sample image records.")
    parser.add_argument("--json", type=Path, help="Write JSON report to this path.")
    parser.add_argument("--markdown", type=Path, help="Write Markdown summary to this path.")
    parser.add_argument("--svg", type=Path, help="Write SVG summary chart to this path.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    records = load_records(sample_path() if args.sample else args.input)
    report = evaluate_records(records)

    if args.json:
        write_json(report, args.json)
    if args.markdown:
        write_markdown(report, args.markdown)
    if args.svg:
        write_svg(report, args.svg)

    summary = report["summary"]
    print(
        "Image metadata KG guard: "
        f"{summary['publish']} publish, {summary['review']} review, "
        f"{summary['block']} block, {summary['safe_edge_count']} safe edges."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
