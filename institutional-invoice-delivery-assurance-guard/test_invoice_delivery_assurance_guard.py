import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("invoice_delivery_assurance_guard.py")
SPEC = importlib.util.spec_from_file_location("invoice_delivery_assurance_guard", MODULE_PATH)
guard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = guard
SPEC.loader.exec_module(guard)


class InvoiceDeliveryAssuranceGuardTest(unittest.TestCase):
    def test_sample_summary_counts(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))

        self.assertEqual(report["summary"]["total"], 5)
        self.assertEqual(report["summary"]["release_to_ar"], 1)
        self.assertEqual(report["summary"]["retry_delivery"], 1)
        self.assertEqual(report["summary"]["hold_for_finance"], 3)
        self.assertGreaterEqual(report["summary"]["action_count"], 8)

    def test_healthy_invoice_releases_to_ar(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        invoice = next(item for item in report["invoices"] if item["invoice_id"] == "INV-DELIV-001")

        self.assertEqual(invoice["decision"], "release_to_ar")
        self.assertEqual(invoice["ar_status"], "start_ar_aging")
        self.assertEqual(len(invoice["findings"]), 0)
        route_types = {route["type"] for route in invoice["accepted_routes"]}
        self.assertEqual(route_types, {"email", "portal"})

    def test_hard_bounce_holds_invoice_before_collections(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        invoice = next(item for item in report["invoices"] if item["invoice_id"] == "INV-BOUNCE-002")
        codes = {finding["code"] for finding in invoice["findings"]}
        actions = {action["action"] for action in invoice["actions"]}

        self.assertEqual(invoice["decision"], "hold_for_finance")
        self.assertEqual(invoice["ar_status"], "do_not_age_or_dun")
        self.assertIn("HARD_DELIVERY_BOUNCE", codes)
        self.assertIn("NO_ACCEPTED_DELIVERY_ROUTE", codes)
        self.assertIn("STALE_AP_CONTACT", codes)
        self.assertIn("refresh-ap-route-and-redeliver", actions)
        self.assertIn("pause-ar-aging-and-dunning", actions)

    def test_missing_portal_receipt_retries_delivery(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        invoice = next(item for item in report["invoices"] if item["invoice_id"] == "INV-PORTAL-003")
        codes = {finding["code"] for finding in invoice["findings"]}
        actions = {action["action"] for action in invoice["actions"]}

        self.assertEqual(invoice["decision"], "retry_delivery")
        self.assertIn("MISSING_PORTAL_RECEIPT", codes)
        self.assertIn("upload-to-customer-portal", actions)

    def test_po_required_invoice_without_attachment_is_held(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        invoice = next(item for item in report["invoices"] if item["invoice_id"] == "INV-PO-004")
        codes = {finding["code"] for finding in invoice["findings"]}

        self.assertEqual(invoice["decision"], "hold_for_finance")
        self.assertIn("MISSING_PO_ATTACHMENT", codes)

    def test_delivered_hash_mismatch_is_blocking(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        invoice = next(item for item in report["invoices"] if item["invoice_id"] == "INV-HASH-005")
        codes = {finding["code"] for finding in invoice["findings"]}

        self.assertEqual(invoice["decision"], "hold_for_finance")
        self.assertIn("DELIVERED_PDF_HASH_MISMATCH", codes)
        self.assertIn("MISSING_FINANCE_OWNER", codes)

    def test_report_writers_create_artifacts(self):
        report = guard.evaluate_invoices(guard.load_packets(guard.sample_path()))
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            json_path = tmp_path / "report.json"
            markdown_path = tmp_path / "summary.md"
            svg_path = tmp_path / "graph.svg"

            guard.write_json(report, json_path)
            guard.write_markdown(report, markdown_path)
            guard.write_svg(report, svg_path)

            self.assertEqual(json.loads(json_path.read_text())["summary"]["total"], 5)
            self.assertIn("INV-BOUNCE-002", markdown_path.read_text())
            self.assertIn("<svg", svg_path.read_text())

    def test_cli_sample_mode(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            result = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    "--sample",
                    "--json",
                    str(tmp_path / "report.json"),
                    "--markdown",
                    str(tmp_path / "summary.md"),
                    "--svg",
                    str(tmp_path / "graph.svg"),
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertIn("1 release, 1 retry, 3 hold", result.stdout)
            self.assertTrue((tmp_path / "report.json").exists())
            self.assertTrue((tmp_path / "summary.md").exists())
            self.assertTrue((tmp_path / "graph.svg").exists())


if __name__ == "__main__":
    unittest.main()
