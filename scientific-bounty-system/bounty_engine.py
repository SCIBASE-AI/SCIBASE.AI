"""
Scientific Bounty Engine: Scoring, Leaderboard Ranking, and Escrow Calculations.
"""
from typing import List, Dict, Any

def rank_submissions(submissions: List[Dict[str, Any]], higher_is_better: bool = True) -> List[Dict[str, Any]]:
    """
    Ranks submissions based on composite benchmark and peer-review scores.
    Composite = (0.7 * benchmark_score) + (0.3 * peer_review_score)
    """
    ranked = []
    for sub in submissions:
        composite = (sub.get("benchmark_score", 0.0) * 0.7) + (sub.get("peer_review_score", 0.0) * 0.3)
        sub_copy = dict(sub)
        sub_copy["composite_score"] = round(composite, 4)
        ranked.append(sub_copy)

    ranked.sort(key=lambda x: x["composite_score"], reverse=higher_is_better)
    for idx, item in enumerate(ranked, 1):
        item["final_rank"] = idx
    return ranked

def calculate_payouts(bounty_amount: float, payout_model: str, ranked_subs: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculates escrow disbursement across ranked solvers according to model.
    """
    if not ranked_subs or bounty_amount <= 0:
        return {}

    payouts = {}
    if payout_model == "WINNER_TAKES_ALL":
        winner = ranked_subs[0]
        payouts[winner["solver_id"]] = bounty_amount

    elif payout_model == "PROPORTIONAL_SPLIT":
        # Split across top 3: 50% for 1st, 30% for 2nd, 20% for 3rd
        weights = [0.50, 0.30, 0.20]
        for idx, sub in enumerate(ranked_subs[:3]):
            payouts[sub["solver_id"]] = round(bounty_amount * weights[idx], 2)

    elif payout_model == "MILESTONE_BASED":
        winner = ranked_subs[0]
        payouts[winner["solver_id"]] = bounty_amount

    return payouts
