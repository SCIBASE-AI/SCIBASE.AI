import unittest
from repo_engine import compute_data_pointer, validate_fair_metadata, generate_cff_citation

class TestScientificRepoEngine(unittest.TestCase):
    def test_data_pointer_generation(self):
        sample_bytes = b"experiment_raw_data_array_tensor_01"
        pointer = compute_data_pointer(sample_bytes, "experiment_01.h5")
        self.assertEqual(pointer["path"], "experiment_01.h5")
        self.assertTrue(pointer["content_hash"].startswith("sha256:"))
        self.assertEqual(pointer["size_bytes"], len(sample_bytes))

    def test_fair_metadata_validation(self):
        valid_meta = {
            "title": "Quantum Coherence Mapping",
            "authors": [{"name": "Dr. Marie Curie", "orcid": "0000-0002-1825-0097"}],
            "license": "Apache-2.0"
        }
        self.assertTrue(validate_fair_metadata(valid_meta))
        self.assertFalse(validate_fair_metadata({"title": "Missing Authors"}))

    def test_cff_generation(self):
        meta = {
            "title": "Cosmic Ray Velocity Study",
            "license": "MIT",
            "authors": [{"name": "Enrico Fermi"}]
        }
        cff = generate_cff_citation(meta)
        self.assertIn("cff-version: 1.2.0", cff)
        self.assertIn('title: "Cosmic Ray Velocity Study"', cff)
        self.assertIn('license: "MIT"', cff)

if __name__ == "__main__":
    unittest.main()
