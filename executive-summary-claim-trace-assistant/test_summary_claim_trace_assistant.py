import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("summary_claim_trace_assistant.py")
SPEC = importlib.util.spec_from_file_location("summary_claim_trace_assistant", MODULE_PATH)
assistant = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = assistant
SPEC.loader.exec_module(assistant)


class ExecutiveSummaryClaimTraceAssistantTest(unittest.TestCase):
    def test_sample_summary_counts(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))

        self.assertEqual(report["summary"]["total"], 6)
        self.assertEqual(report["summary"]["publish"], 2)
        self.assertEqual(report["summary"]["revise"], 2)
        self.assertEqual(report["summary"]["block"], 2)
        self.assertGreaterEqual(report["summary"]["trace_count"], 5)

    def test_traced_key_finding_can_publish(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))
        review = next(item for item in report["bullet_reviews"] if item["bullet_id"] == "SUM-001")

        self.assertEqual(review["decision"], "publish")
        self.assertEqual(review["findings"], [])
        self.assertEqual(review["evidence_trace"][0]["evidence_id"], "EV-RESULT-001")

    def test_overbroad_next_step_requires_revision(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))
        review = next(item for item in report["bullet_reviews"] if item["bullet_id"] == "SUM-003")
        codes = {finding["code"] for finding in review["findings"]}

        self.assertEqual(review["decision"], "revise")
        self.assertIn("OVERBROAD_LANGUAGE", codes)
        self.assertIn("could be evaluated", review["rewrite"])

    def test_missing_or_unknown_evidence_blocks_bullet(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))
        missing = next(item for item in report["bullet_reviews"] if item["bullet_id"] == "SUM-004")
        untraced = next(item for item in report["bullet_reviews"] if item["bullet_id"] == "SUM-005")

        self.assertEqual(missing["decision"], "block")
        self.assertEqual(untraced["decision"], "block")
        self.assertIn("UNKNOWN_EVIDENCE_ID", {finding["code"] for finding in missing["findings"]})
        self.assertIn("MISSING_EVIDENCE_TRACE", {finding["code"] for finding in untraced["findings"]})

    def test_unsupported_numeric_detail_requires_revision(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))
        review = next(item for item in report["bullet_reviews"] if item["bullet_id"] == "SUM-006")
        codes = {finding["code"] for finding in review["findings"]}

        self.assertEqual(review["decision"], "revise")
        self.assertIn("UNSUPPORTED_NUMERIC_DETAIL", codes)
        self.assertIn("OVERBROAD_LANGUAGE", codes)
        self.assertIn("exact values", review["rewrite"])

    def test_artifact_writers(self):
        report = assistant.review_packet(assistant.load_packet(assistant.sample_path()))
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            json_path = root / "report.json"
            markdown_path = root / "summary.md"
            svg_path = root / "graph.svg"

            assistant.write_json(report, json_path)
            assistant.write_markdown(report, markdown_path)
            assistant.write_svg(report, svg_path)

            self.assertEqual(json.loads(json_path.read_text())["summary"]["total"], 6)
            self.assertIn("SUM-004", markdown_path.read_text())
            self.assertIn("<svg", svg_path.read_text())

    def test_cli_sample_mode(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            result = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    "--sample",
                    "--json",
                    str(root / "report.json"),
                    "--markdown",
                    str(root / "summary.md"),
                    "--svg",
                    str(root / "graph.svg"),
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertIn("2 publish, 2 revise, 2 block", result.stdout)
            self.assertTrue((root / "report.json").exists())
            self.assertTrue((root / "summary.md").exists())
            self.assertTrue((root / "graph.svg").exists())


if __name__ == "__main__":
    unittest.main()
