import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("image_metadata_provenance_guard.py")
SPEC = importlib.util.spec_from_file_location("image_metadata_provenance_guard", MODULE_PATH)
guard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = guard
SPEC.loader.exec_module(guard)


class ImageMetadataProvenanceGuardTest(unittest.TestCase):
    def test_sample_summary_counts(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))

        self.assertEqual(report["summary"]["total"], 5)
        self.assertEqual(report["summary"]["publish"], 1)
        self.assertEqual(report["summary"]["review"], 2)
        self.assertEqual(report["summary"]["block"], 2)
        self.assertGreaterEqual(report["summary"]["safe_edge_count"], 12)

    def test_publish_record_emits_public_graph_edges(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))
        published = next(record for record in report["records"] if record["image_id"] == "IMG-CELL-001")

        self.assertEqual(published["decision"], "publish")
        self.assertEqual(published["release_scope"], "public_kg")
        predicates = {edge["predicate"] for edge in published["safe_edges"]}
        self.assertIn("member_of_dataset", predicates)
        self.assertIn("uses_protocol", predicates)
        self.assertIn("captured_by", predicates)
        self.assertTrue(all(edge["visibility"] == "public" for edge in published["safe_edges"]))

    def test_phi_and_chronology_block_public_release(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))
        blocked = next(record for record in report["records"] if record["image_id"] == "IMG-PATH-003")
        codes = {finding["code"] for finding in blocked["findings"]}

        self.assertEqual(blocked["decision"], "block")
        self.assertEqual(blocked["release_scope"], "do_not_publish")
        self.assertIn("ACQUIRED_AFTER_PUBLICATION", codes)
        self.assertIn("PRIVATE_TAG_PRESENT", codes)
        self.assertIn("PRIVATE_VALUE_IN_FILENAME", codes)
        self.assertIn("PRIVATE_METADATA_FIELD", codes)
        self.assertGreaterEqual(len(blocked["redactions"]), 3)

    def test_microscopy_without_channel_metadata_requires_review(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))
        reviewed = next(record for record in report["records"] if record["image_id"] == "IMG-SLIDE-002")
        codes = {finding["code"] for finding in reviewed["findings"]}

        self.assertEqual(reviewed["decision"], "review")
        self.assertIn("MISSING_CHANNELS", codes)
        self.assertIn("MISSING_PIXEL_SIZE", codes)
        self.assertTrue(all(edge["visibility"] == "internal" for edge in reviewed["safe_edges"]))

    def test_derived_figure_without_source_is_blocked(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))
        blocked = next(record for record in report["records"] if record["image_id"] == "FIG-DERIVED-004")
        codes = {finding["code"] for finding in blocked["findings"]}

        self.assertEqual(blocked["decision"], "block")
        self.assertIn("MISSING_DERIVED_SOURCE", codes)

    def test_report_writers_create_reviewer_artifacts(self):
        report = guard.evaluate_records(guard.load_records(guard.sample_path()))

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            json_path = tmp_path / "report.json"
            markdown_path = tmp_path / "summary.md"
            svg_path = tmp_path / "graph.svg"

            guard.write_json(report, json_path)
            guard.write_markdown(report, markdown_path)
            guard.write_svg(report, svg_path)

            self.assertEqual(json.loads(json_path.read_text())["summary"]["total"], 5)
            self.assertIn("IMG-PATH-003", markdown_path.read_text())
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

            self.assertIn("1 publish, 2 review, 2 block", result.stdout)
            self.assertTrue((tmp_path / "report.json").exists())
            self.assertTrue((tmp_path / "summary.md").exists())
            self.assertTrue((tmp_path / "graph.svg").exists())


if __name__ == "__main__":
    unittest.main()
