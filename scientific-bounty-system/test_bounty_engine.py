import unittest
from bounty_engine import rank_submissions, calculate_payouts

class TestScientificBountyEngine(unittest.TestCase):
    def setUp(self):
        self.sample_submissions = [
            {"solver_id": "solver_alpha", "benchmark_score": 92.5, "peer_review_score": 88.0},
            {"solver_id": "solver_beta", "benchmark_score": 96.0, "peer_review_score": 94.0},
            {"solver_id": "solver_gamma", "benchmark_score": 85.0, "peer_review_score": 90.0}
        ]

    def test_ranking_composite_score(self):
        ranked = rank_submissions(self.sample_submissions)
        self.assertEqual(ranked[0]["solver_id"], "solver_beta")
        self.assertEqual(ranked[0]["final_rank"], 1)
        self.assertEqual(ranked[1]["solver_id"], "solver_alpha")
        self.assertEqual(ranked[2]["solver_id"], "solver_gamma")

    def test_winner_takes_all_payout(self):
        ranked = rank_submissions(self.sample_submissions)
        payouts = calculate_payouts(1000.0, "WINNER_TAKES_ALL", ranked)
        self.assertEqual(payouts["solver_beta"], 1000.0)
        self.assertNotIn("solver_alpha", payouts)

    def test_proportional_split_payout(self):
        ranked = rank_submissions(self.sample_submissions)
        payouts = calculate_payouts(1000.0, "PROPORTIONAL_SPLIT", ranked)
        self.assertEqual(payouts["solver_beta"], 500.0)
        self.assertEqual(payouts["solver_alpha"], 300.0)
        self.assertEqual(payouts["solver_gamma"], 200.0)

    def test_empty_submissions(self):
        payouts = calculate_payouts(1000.0, "WINNER_TAKES_ALL", [])
        self.assertEqual(payouts, {})

if __name__ == "__main__":
    unittest.main()
