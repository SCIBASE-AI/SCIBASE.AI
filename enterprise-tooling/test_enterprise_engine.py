import unittest
from enterprise_engine import create_audit_event, check_quota_available

class TestEnterpriseEngine(unittest.TestCase):
    def test_audit_event_generation(self):
        event = create_audit_event("org_harvard_bio", "admin_01", "DATASET_DOWNLOAD", "dataset_genomics_01")
        self.assertEqual(event["org_id"], "org_harvard_bio")
        self.assertEqual(event["action"], "DATASET_DOWNLOAD")
        self.assertTrue(len(event["signature"]) == 64)

    def test_quota_limits(self):
        quota = {"max_gpu_hours": 100.0, "used_gpu_hours": 80.0}
        self.assertTrue(check_quota_available(quota, 15.0)) # 95 <= 100 -> OK
        self.assertFalse(check_quota_available(quota, 25.0)) # 105 > 100 -> False

if __name__ == "__main__":
    unittest.main()
