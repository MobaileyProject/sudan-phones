#!/usr/bin/env python3
"""Scan tracked and staged files for accidental credentials, secrets, or private keys."""

import re
import subprocess
import sys
from pathlib import Path

FORBIDDEN_PATTERNS = [
    (re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"), "Private key header"),
    (re.compile(r"xox[baprs]-[0-9a-zA-Z-]{20,}"), "Slack raw API token"),
    (re.compile(r"ghp_[0-9a-zA-Z]{36}"), "GitHub Personal Access Token"),
    (re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}"), "Raw JWT token"),
    (re.compile(r"(?:postgres|postgresql)://[^:]+:[^@]+@[^/]+/[^ \n\r\t]+"), "Hardcoded database URI with password"),
]

FORBIDDEN_FILES = {
    ".env",
    ".demo-credentials.json",
    "local.properties",
}


def main():
    root = Path(__file__).resolve().parents[1]
    
    # Get tracked files
    res = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True)
    files = [f.strip() for f in res.stdout.splitlines() if f.strip()]
    
    violations = []
    
    for rel_path in files:
        path = root / rel_path
        if not path.is_file():
            continue
            
        if path.name in FORBIDDEN_FILES:
            violations.append(f"Forbidden file tracked in git: {rel_path}")
            continue
            
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
            
        # Skip scanning check_secrets.py itself for its regex definitions
        if rel_path == "scripts/check_secrets.py":
            continue
            
        for pattern, desc in FORBIDDEN_PATTERNS:
            if pattern.search(content):
                violations.append(f"{desc} detected in {rel_path}")
                
    if violations:
        print("SECRET CHECK FAILED:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
        
    print("No forbidden credentials or secrets detected.")
    sys.exit(0)


if __name__ == "__main__":
    main()
