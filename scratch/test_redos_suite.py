"""
LANDSLIDEGUARD SIH26001 - Automated ReDoS (Regular Expression Denial of Service) Security & Performance Test Suite
Tests adversarial strings (repeated characters, nested structures, near-matches, oversized strings)
against all regex validators and endpoints to verify strictly linear execution and absence of catastrophic backtracking.
"""

import time
import re
import urllib.request
import urllib.error
import json
import sys
import os

sys.path.insert(0, os.path.abspath("."))

from backend.app.core.security import (
    validate_email_format,
    validate_username_policy,
    validate_password_policy
)

BASE_URL = "http://127.0.0.1:8000"

def benchmark_fn(fn, *args, iterations=1000):
    start = time.perf_counter()
    for _ in range(iterations):
        fn(*args)
    duration_ms = (time.perf_counter() - start) * 1000.0 / iterations
    return duration_ms


def run_redos_audit():
    print("=" * 60)
    print("LANDSLIDEGUARD SIH26001 - ReDoS SECURITY & PERFORMANCE BENCHMARK")
    print("=" * 60)

    results = []

    # ---------------- 1. EMAIL VALIDATION BENCHMARKS ----------------
    # Case 1a: Standard valid email
    t_normal = benchmark_fn(validate_email_format, "resident.safety@landslideguard.gov.in")
    results.append(("REDOS-01", "Email - Standard Valid", t_normal < 1.0, f"{t_normal:.4f} ms"))

    # Case 1b: 250-char valid boundary email
    long_valid_email = "a" * 230 + "@example.com"
    t_long_valid = benchmark_fn(validate_email_format, long_valid_email)
    results.append(("REDOS-02", "Email - 240-Char Bounded Valid", t_long_valid < 1.0, f"{t_long_valid:.4f} ms"))

    # Case 1c: Adversarial repeated 'a' with missing '@'
    adversarial_email_1 = "a" * 5000 + "!"
    t_adv_1 = benchmark_fn(validate_email_format, adversarial_email_1)
    results.append(("REDOS-03", "Email - 5,000 Chars Unmatched (No @)", t_adv_1 < 1.0, f"{t_adv_1:.4f} ms"))

    # Case 1d: Adversarial near-match (repeated domain segments with invalid TLD)
    adversarial_email_2 = "user@" + ("subdomain." * 200) + "invalid_tld_long!"
    t_adv_2 = benchmark_fn(validate_email_format, adversarial_email_2)
    results.append(("REDOS-04", "Email - Pathological Subdomain Chain", t_adv_2 < 1.0, f"{t_adv_2:.4f} ms"))

    # ---------------- 2. USERNAME VALIDATION BENCHMARKS ----------------
    # Case 2a: Standard valid username
    t_user_normal = benchmark_fn(validate_username_policy, "dr_arun_sharma_ndma")
    results.append(("REDOS-05", "Username - Standard Valid", t_user_normal < 1.0, f"{t_user_normal:.4f} ms"))

    # Case 2b: Adversarial oversized username (10,000 chars)
    adversarial_user = "a" * 10000 + "@"
    t_user_adv = benchmark_fn(validate_username_policy, adversarial_user)
    results.append(("REDOS-06", "Username - 10,000 Chars Adversarial", t_user_adv < 1.0, f"{t_user_adv:.4f} ms"))

    # ---------------- 3. PASSWORD VALIDATION BENCHMARKS ----------------
    # Case 3a: Standard valid password
    t_pw_normal = benchmark_fn(validate_password_policy, "Secure@2026!Pass")
    results.append(("REDOS-07", "Password - Standard Valid", t_pw_normal < 1.0, f"{t_pw_normal:.4f} ms"))

    # Case 3b: Adversarial 5,000-char password with missing special char
    adversarial_pw = ("Ab1" * 1000)
    t_pw_adv = benchmark_fn(validate_password_policy, adversarial_pw)
    results.append(("REDOS-08", "Password - 3,000 Chars Adversarial", t_pw_adv < 1.0, f"{t_pw_adv:.4f} ms"))

    # ---------------- 4. HTTP API OVERSHOOT & REJECTION TESTS ----------------
    # Case 4a: Endpoint with 5,000-char search string (Expected: HTTP 422 rejected in < 50ms)
    req = urllib.request.Request(
        f"{BASE_URL}/api/location-intelligence/search",
        data=json.dumps({"query": "a" * 5000}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    start_http = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            http_code = resp.status
    except urllib.error.HTTPError as e:
        http_code = e.code
    except Exception:
        http_code = 0
    http_time = (time.perf_counter() - start_http) * 1000.0
    results.append(("REDOS-09", "API - 5,000-Char Location Search Bound", http_code == 422 and http_time < 50.0, f"{http_time:.2f} ms (HTTP {http_code})"))

    # Case 4b: Oversized Community Report Description (50,000 chars rejected by Pydantic)
    req = urllib.request.Request(
        f"{BASE_URL}/api/reports",
        data=json.dumps({
            "zone_id": "HP-01",
            "report_type": "Cracks",
            "description": "Debris " * 5000,
            "latitude": 25.9,
            "longitude": 91.8
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    start_http = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            http_code = resp.status
    except urllib.error.HTTPError as e:
        http_code = e.code
    except Exception:
        http_code = 0
    http_time = (time.perf_counter() - start_http) * 1000.0
    # Expected: HTTP 422 Unprocessable Entity due to max_length=2000
    results.append(("REDOS-10", "API - Oversized 35KB Report Description Limit", http_code == 422, f"{http_time:.2f} ms (HTTP {http_code})"))

    print("\n--- ReDoS SECURITY AUDIT RESULTS ---")
    all_passed = True
    for test_id, name, passed, metric in results:
        status_str = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"{status_str} {test_id} - {name} -> {metric}")

    print("\n" + "=" * 60)
    print(f"TOTAL AUDITED BENCHMARKS: {len(results)} | PASSED: {sum(1 for r in results if r[2])} | VULNERABLE: {sum(1 for r in results if not r[2])}")
    print("=" * 60)

    if all_passed:
        print("[+] VERDICT: SAFE AGAINST ReDoS (REGULAR EXPRESSION DENIAL OF SERVICE)")
        return 0
    else:
        print("[-] VERDICT: VULNERABILITIES DETECTED!")
        return 1

if __name__ == "__main__":
    sys.exit(run_redos_audit())
