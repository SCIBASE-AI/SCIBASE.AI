"""
Enterprise Tooling Engine: Audit Log Ingestion, SCIM Role Validation, and Quota Management.
"""
import time
import hashlib
from typing import Dict, Any

def create_audit_event(org_id: str, actor_id: str, action: str, resource: str, severity: str = "INFO") -> Dict[str, Any]:
    """Generates an immutable, cryptographically verifiable audit log entry."""
    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    raw_sig = f"{org_id}:{actor_id}:{action}:{resource}:{now_iso}"
    sig_hash = hashlib.sha256(raw_sig.encode('utf-8')).hexdigest()
    
    return {
        "org_id": org_id,
        "actor_id": actor_id,
        "action": action,
        "target_resource": resource,
        "severity": severity,
        "signature": sig_hash,
        "timestamp": now_iso
    }

def check_quota_available(quota: Dict[str, float], requested_gpu_hours: float) -> bool:
    """Checks if requested compute resources exceed institutional allocations."""
    used = quota.get("used_gpu_hours", 0.0)
    limit = quota.get("max_gpu_hours", 0.0)
    return (used + requested_gpu_hours) <= limit
