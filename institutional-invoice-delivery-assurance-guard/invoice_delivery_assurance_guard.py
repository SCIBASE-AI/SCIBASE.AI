#!/usr/bin/env python3
"""Validate institutional invoice delivery evidence before AR aging."""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


HASH_RE = re.compile(r"^sha256:[0-9a-fA-F]{64}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"}
DELIVERED_STATUSES = {"accepted", "delivered", "uploaded"}
BOUNCE_STATUSES = {"hard_bounce", "blocked", "invalid_address"}
RETRY_STATUSES = {"soft_bounce", "deferred", "pending", "queued"}


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str
    message: str
    field: str | None = None

    def to_dict(self) -> dict[str, Any]:
        result = {
            "code": self.code,
            "severity": self.severity,
            "message": self.message,
        }
        if self.field:
            result["field"] = self.field
        return result


@dataclass(frozen=True)
class DeliveryAction:
    action: str
    owner: str
    reason: str

    def to_dict(self) -> dict[str, str]:
        return {"action": self.action, "owner": self.owner, "reason": self.reason}


@dataclass
class DeliveryResult:
    invoice_id: str
    account_id: str
    decision: str
    ar_status: str
    findings: list[Finding] = field(default_factory=list)
    actions: list[DeliveryAction] = field(default_factory=list)
    accepted_routes: list[dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "invoice_id": self.invoice_id,
            "account_id": self.account_id,
            "decision": self.decision,
            "ar_status": self.ar_status,
            "findings": [finding.to_dict() for finding in self.findings],
            "actions": [action.to_dict() for action in self.actions],
            "accepted_routes": self.accepted_routes,
        }


def _parse_date(value: Any) -> dt.date | None:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _days_between(first: dt.date | None, second: dt.date | None) -> int | None:
    if first is None or second is None:
        return None
    return (second - first).days


def evaluate_invoice(packet: dict[str, Any], *, as_of: dt.date | None = None) -> DeliveryResult:
    """Evaluate one invoice delivery packet."""

    review_date = as_of or dt.date(2026, 5, 31)
    invoice_id = str(packet.get("invoice_id") or "UNKNOWN")
    account_id = str(packet.get("account_id") or "UNKNOWN")
    finance_owner = str(packet.get("finance_owner") or "").strip()
    issued_at = _parse_date(packet.get("issued_at"))
    due_at = _parse_date(packet.get("due_at"))
    findings: list[Finding] = []
    actions: list[DeliveryAction] = []

    if invoice_id == "UNKNOWN":
        findings.append(Finding("MISSING_INVOICE_ID", "block", "Invoice lacks a stable ID.", "invoice_id"))
    if account_id == "UNKNOWN":
        findings.append(Finding("MISSING_ACCOUNT_ID", "block", "Invoice lacks an account ID.", "account_id"))

    amount_cents = packet.get("amount_cents")
    if not isinstance(amount_cents, int) or amount_cents <= 0:
        findings.append(
            Finding("INVALID_AMOUNT", "block", "Invoice amount must be a positive integer of cents.", "amount_cents")
        )

    currency = str(packet.get("currency") or "").upper()
    if currency not in SUPPORTED_CURRENCIES:
        findings.append(Finding("UNSUPPORTED_CURRENCY", "review", "Currency needs finance review.", "currency"))

    invoice_hash = str(packet.get("invoice_hash") or "")
    delivered_pdf_hash = str(packet.get("delivered_pdf_hash") or "")
    if not HASH_RE.match(invoice_hash):
        findings.append(Finding("INVALID_INVOICE_HASH", "block", "Invoice hash is not a sha256 digest.", "invoice_hash"))
    if not HASH_RE.match(delivered_pdf_hash):
        findings.append(
            Finding("INVALID_DELIVERED_HASH", "block", "Delivered PDF hash is not a sha256 digest.", "delivered_pdf_hash")
        )
    if HASH_RE.match(invoice_hash) and HASH_RE.match(delivered_pdf_hash) and invoice_hash != delivered_pdf_hash:
        findings.append(
            Finding(
                "DELIVERED_PDF_HASH_MISMATCH",
                "block",
                "Delivered PDF hash does not match the approved invoice payload.",
                "delivered_pdf_hash",
            )
        )

    if issued_at is None:
        findings.append(Finding("MISSING_ISSUE_DATE", "review", "Invoice lacks a parseable issue date.", "issued_at"))
    if due_at is None:
        findings.append(Finding("MISSING_DUE_DATE", "review", "Invoice lacks a parseable due date.", "due_at"))
    if issued_at and due_at and due_at < issued_at:
        findings.append(Finding("DUE_BEFORE_ISSUE", "block", "Invoice due date is before issue date.", "due_at"))

    if packet.get("terms_require_po"):
        purchase_order_id = str(packet.get("purchase_order_id") or "").strip()
        po_attachment_hash = str(packet.get("po_attachment_hash") or "").strip()
        if not purchase_order_id:
            findings.append(
                Finding("MISSING_PURCHASE_ORDER", "block", "PO-required account has no purchase order ID.", "purchase_order_id")
            )
        if not HASH_RE.match(po_attachment_hash):
            findings.append(
                Finding(
                    "MISSING_PO_ATTACHMENT",
                    "block",
                    "PO-required account has no auditable PO attachment hash.",
                    "po_attachment_hash",
                )
            )

    ap_verified_at = _parse_date(packet.get("ap_contact_verified_at"))
    days_since_ap_check = _days_between(ap_verified_at, review_date)
    if ap_verified_at is None:
        findings.append(
            Finding("MISSING_AP_CONTACT_VERIFICATION", "review", "AP contact verification date is missing.", "ap_contact_verified_at")
        )
    elif days_since_ap_check is not None and days_since_ap_check > 180:
        findings.append(
            Finding(
                "STALE_AP_CONTACT",
                "review",
                "AP contact verification is older than 180 days.",
                "ap_contact_verified_at",
            )
        )

    accepted_routes = _accepted_routes(packet.get("delivery_channels") or [])
    route_findings = _evaluate_delivery_routes(packet)
    findings.extend(route_findings)

    if not finance_owner:
        findings.append(
            Finding("MISSING_FINANCE_OWNER", "review", "Failed delivery packets need an accountable finance owner.", "finance_owner")
        )

    decision = _decision_from_findings(findings)
    ar_status = {
        "release_to_ar": "start_ar_aging",
        "retry_delivery": "pause_ar_aging_until_delivery_evidence",
        "hold_for_finance": "do_not_age_or_dun",
    }[decision]

    actions.extend(_actions_for_decision(decision, findings, finance_owner or "finance-ops"))

    return DeliveryResult(
        invoice_id=invoice_id,
        account_id=account_id,
        decision=decision,
        ar_status=ar_status,
        findings=findings,
        actions=actions,
        accepted_routes=accepted_routes,
    )


def _accepted_routes(channels: list[dict[str, Any]]) -> list[dict[str, str]]:
    accepted = []
    for channel in channels:
        status = str(channel.get("status") or "").lower()
        if status not in DELIVERED_STATUSES:
            continue
        route_type = str(channel.get("type") or "unknown")
        evidence = str(channel.get("receipt_id") or channel.get("address") or channel.get("portal_name") or "")
        accepted.append({"type": route_type, "status": status, "evidence": evidence})
    return accepted


def _evaluate_delivery_routes(packet: dict[str, Any]) -> list[Finding]:
    channels = packet.get("delivery_channels") or []
    findings: list[Finding] = []
    if not isinstance(channels, list) or not channels:
        return [Finding("NO_DELIVERY_CHANNEL", "block", "Invoice has no delivery channel evidence.", "delivery_channels")]

    has_delivered_route = False
    has_portal_receipt = False
    hard_bounces = 0
    retry_routes = 0

    for index, channel in enumerate(channels):
        route_type = str(channel.get("type") or "").lower()
        status = str(channel.get("status") or "").lower()
        field_prefix = f"delivery_channels[{index}]"

        if route_type == "email":
            address = str(channel.get("address") or "")
            if not EMAIL_RE.match(address):
                findings.append(Finding("INVALID_AP_EMAIL", "review", "AP email route is malformed.", f"{field_prefix}.address"))
        if status in DELIVERED_STATUSES:
            has_delivered_route = True
        if route_type == "portal" and status == "uploaded" and channel.get("receipt_id"):
            has_portal_receipt = True
        if status in BOUNCE_STATUSES:
            hard_bounces += 1
            findings.append(
                Finding("HARD_DELIVERY_BOUNCE", "block", "Invoice route produced a hard delivery bounce.", f"{field_prefix}.status")
            )
        elif status in RETRY_STATUSES:
            retry_routes += 1
            findings.append(
                Finding("DELIVERY_RETRY_PENDING", "review", "Invoice route is still pending retry evidence.", f"{field_prefix}.status")
            )

    if not has_delivered_route:
        severity = "block" if hard_bounces else "review"
        findings.append(
            Finding("NO_ACCEPTED_DELIVERY_ROUTE", severity, "Invoice has no accepted email or portal delivery evidence.", "delivery_channels")
        )

    if packet.get("requires_portal_receipt") and not has_portal_receipt:
        severity = "review" if has_delivered_route or retry_routes else "block"
        findings.append(
            Finding(
                "MISSING_PORTAL_RECEIPT",
                severity,
                "Customer requires a portal receipt before invoice can enter AR aging.",
                "delivery_channels",
            )
        )

    return findings


def _decision_from_findings(findings: Iterable[Finding]) -> str:
    severities = {finding.severity for finding in findings}
    if "block" in severities:
        return "hold_for_finance"
    if "review" in severities:
        return "retry_delivery"
    return "release_to_ar"


def _actions_for_decision(decision: str, findings: Iterable[Finding], owner: str) -> list[DeliveryAction]:
    codes = {finding.code for finding in findings}
    actions: list[DeliveryAction] = []
    if decision == "release_to_ar":
        actions.append(DeliveryAction("release-invoice-to-ar-aging", owner, "accepted delivery evidence present"))
        return actions

    actions.append(DeliveryAction("pause-ar-aging-and-dunning", owner, "delivery evidence is incomplete or unsafe"))
    if "HARD_DELIVERY_BOUNCE" in codes or "NO_ACCEPTED_DELIVERY_ROUTE" in codes:
        actions.append(DeliveryAction("refresh-ap-route-and-redeliver", owner, "invoice did not reach a verified AP route"))
    if "MISSING_PORTAL_RECEIPT" in codes:
        actions.append(DeliveryAction("upload-to-customer-portal", owner, "portal receipt is required"))
    if "MISSING_PO_ATTACHMENT" in codes or "MISSING_PURCHASE_ORDER" in codes:
        actions.append(DeliveryAction("attach-po-evidence-before-redelivery", owner, "PO-required account lacks auditable evidence"))
    if "DELIVERED_PDF_HASH_MISMATCH" in codes:
        actions.append(DeliveryAction("regenerate-and-redeliver-approved-pdf", owner, "delivered PDF does not match approved invoice"))
    if "STALE_AP_CONTACT" in codes or "MISSING_AP_CONTACT_VERIFICATION" in codes:
        actions.append(DeliveryAction("reverify-ap-contact", owner, "AP route verification is stale or absent"))
    return actions


def evaluate_invoices(packets: Iterable[dict[str, Any]], *, as_of: dt.date | None = None) -> dict[str, Any]:
    results = [evaluate_invoice(packet, as_of=as_of) for packet in packets]
    summary = {
        "total": len(results),
        "release_to_ar": sum(1 for result in results if result.decision == "release_to_ar"),
        "retry_delivery": sum(1 for result in results if result.decision == "retry_delivery"),
        "hold_for_finance": sum(1 for result in results if result.decision == "hold_for_finance"),
        "accepted_route_count": sum(len(result.accepted_routes) for result in results),
        "action_count": sum(len(result.actions) for result in results),
    }
    return {
        "guard": "institutional-invoice-delivery-assurance-guard",
        "review_as_of": (as_of or dt.date(2026, 5, 31)).isoformat(),
        "summary": summary,
        "invoices": [result.to_dict() for result in results],
    }


def sample_path() -> Path:
    return Path(__file__).with_name("sample_invoice_deliveries.json")


def load_packets(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        packets = json.load(handle)
    if not isinstance(packets, list):
        raise ValueError("Input JSON must be a list of invoice delivery packets.")
    return packets


def write_json(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_markdown(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    lines = [
        "# Institutional Invoice Delivery Assurance Summary",
        "",
        f"- Total invoices: {summary['total']}",
        f"- Release to AR: {summary['release_to_ar']}",
        f"- Retry delivery: {summary['retry_delivery']}",
        f"- Hold for finance: {summary['hold_for_finance']}",
        f"- Accepted routes: {summary['accepted_route_count']}",
        f"- Required actions: {summary['action_count']}",
        "",
        "| Invoice | Decision | AR status | Findings | Actions |",
        "| --- | --- | --- | --- | --- |",
    ]
    for invoice in report["invoices"]:
        findings = ", ".join(finding["code"] for finding in invoice["findings"]) or "none"
        actions = ", ".join(action["action"] for action in invoice["actions"]) or "none"
        lines.append(
            "| {invoice_id} | {decision} | {ar_status} | {findings} | {actions} |".format(
                invoice_id=invoice["invoice_id"],
                decision=invoice["decision"],
                ar_status=invoice["ar_status"],
                findings=findings,
                actions=actions,
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_svg(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = report["summary"]
    bars = [
        ("release_to_ar", "#2f855a", summary["release_to_ar"]),
        ("retry_delivery", "#b7791f", summary["retry_delivery"]),
        ("hold_for_finance", "#c53030", summary["hold_for_finance"]),
    ]
    max_count = max([count for _, _, count in bars] + [1])
    rows = []
    for index, (label, color, count) in enumerate(bars):
        y = 82 + index * 58
        width = int(300 * count / max_count)
        rows.append(f'<text x="32" y="{y + 20}" font-size="15" fill="#1a202c">{html.escape(label)}</text>')
        rows.append(f'<rect x="170" y="{y}" width="{width}" height="30" rx="4" fill="{color}" />')
        rows.append(f'<text x="{182 + width}" y="{y + 20}" font-size="15" fill="#1a202c">{count}</text>')
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="620" height="300" viewBox="0 0 620 300" role="img" aria-label="Invoice delivery assurance guard summary">
  <rect width="620" height="300" fill="#f8fafc"/>
  <text x="32" y="42" font-size="22" font-family="Arial, sans-serif" fill="#1a202c">Invoice Delivery Assurance</text>
  <text x="32" y="64" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Gate invoices before AR aging, dunning, or collections</text>
  {''.join(rows)}
  <text x="32" y="270" font-size="13" font-family="Arial, sans-serif" fill="#4a5568">Accepted routes: {summary['accepted_route_count']} | Required actions: {summary['action_count']}</text>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--input", type=Path, help="Path to invoice delivery packet JSON.")
    input_group.add_argument("--sample", action="store_true", help="Use bundled synthetic sample packets.")
    parser.add_argument("--as-of", default="2026-05-31", help="Review date for stale AP contact checks.")
    parser.add_argument("--json", type=Path, help="Write JSON report.")
    parser.add_argument("--markdown", type=Path, help="Write Markdown summary.")
    parser.add_argument("--svg", type=Path, help="Write SVG chart.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    review_date = _parse_date(args.as_of)
    if review_date is None:
        raise SystemExit("--as-of must be an ISO date.")
    packets = load_packets(sample_path() if args.sample else args.input)
    report = evaluate_invoices(packets, as_of=review_date)
    if args.json:
        write_json(report, args.json)
    if args.markdown:
        write_markdown(report, args.markdown)
    if args.svg:
        write_svg(report, args.svg)
    summary = report["summary"]
    print(
        "Invoice delivery guard: "
        f"{summary['release_to_ar']} release, {summary['retry_delivery']} retry, "
        f"{summary['hold_for_finance']} hold."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
