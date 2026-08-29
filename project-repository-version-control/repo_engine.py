"""
Scientific Project Repository Engine: Data Pointers, FAIR Validation, and CFF Formatting.
"""
import hashlib
import json
from typing import Dict, Any, List

def compute_data_pointer(file_content: bytes, filename: str, backend: str = "DVC_S3") -> Dict[str, Any]:
    """Generates a cryptographic content-addressed pointer for large research files."""
    sha256_hash = hashlib.sha256(file_content).hexdigest()
    return {
        "path": filename,
        "storage_backend": backend,
        "content_hash": f"sha256:{sha256_hash}",
        "size_bytes": len(file_content)
    }

def validate_fair_metadata(metadata: Dict[str, Any]) -> bool:
    """Validates that project metadata meets minimal FAIR open science criteria."""
    required_fields = ["title", "authors", "license"]
    if not all(field in metadata and metadata[field] for field in required_fields):
        return False
    if not isinstance(metadata.get("authors"), list) or len(metadata["authors"]) == 0:
        return False
    return True

def generate_cff_citation(metadata: Dict[str, Any]) -> str:
    """Generates standard Citation File Format (CFF) yaml text."""
    cff = [
        'cff-version: 1.2.0',
        f'title: "{metadata.get("title", "Untitled Research Project")}"',
        f'license: "{metadata.get("license", "CC-BY-4.0")}"',
        'authors:'
    ]
    for author in metadata.get("authors", []):
        cff.append(f'  - name: "{author.get("name")}"')
        if author.get("orcid"):
            cff.append(f'    orcid: "{author.get("orcid")}"')
    return "\n".join(cff)
