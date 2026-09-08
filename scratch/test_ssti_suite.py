"""
LANDSLIDEGUARD SIH26001 - Automated Server-Side Template Injection (SSTI) & Dynamic Evaluation Security Test Suite
Tests harmless template payloads (e.g. {{7*7}}, ${7*7}, <%= 7*7 %>, #{7*7}) against all backend input surfaces.
Verifies that all payloads remain literal strings and are NEVER evaluated as code or template expressions (i.e. '49').
"""

import urllib.request
import urllib.error
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000"

def send_request(url, method="GET", data=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed
    except Exception as e:
        return 0, {"error": str(e)}


def run_ssti_audit():
    print("=" * 60)
    print("LANDSLIDEGUARD SIH26001 - SSTI & EVALUATION SECURITY AUDIT SUITE")
    print("=" * 60)

    results = []
    jinja_payload = "{{7*7}}"
    
    # 1. Test Login Identifier with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/auth/login",
        method="POST",
        data={"identifier": "test_" + jinja_payload + "@example.com", "password": "Password123!"}
    )
    is_safe = status_code in [400, 401, 422] and "49" not in str(body.get("detail", ""))
    results.append(("SSTI-01", "Login Identifier Payload", is_safe, status_code, str(body)))

    # 2. Test User Registration with SSTI payload in full_name
    test_user = f"user_{uuid.uuid4().hex[:6]}"
    status_code, body = send_request(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={
            "full_name": "Tester " + jinja_payload,
            "username": f"{test_user}_s",
            "email": f"{test_user}@test.com",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "terms_accepted": True
        }
    )
    user_name_val = body.get("user", {}).get("full_name", "")
    is_safe = status_code == 201 and "Tester {{7*7}}" in user_name_val and "49" not in user_name_val
    results.append(("SSTI-02", "User Registration (full_name)", is_safe, status_code, str(user_name_val)))

    # Login to get token for authenticated endpoints
    status_code, login_body = send_request(
        f"{BASE_URL}/api/auth/login",
        method="POST",
        data={"identifier": "admin@landslideguard.gov.in", "password": "Admin@2026!"}
    )
    admin_token = login_body.get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # 3. Test Profile Update with Multi-Engine SSTI Payloads
    multi_payload = "Name " + r"${7*7}" + " " + r"<%= 7*7 %>" + " " + r"#{7*7}"
    status_code, body = send_request(
        f"{BASE_URL}/api/auth/profile",
        method="PATCH",
        data={"full_name": "Admin " + multi_payload},
        headers=admin_headers
    )
    full_name_val = body.get("full_name", "")
    is_safe = status_code == 200 and multi_payload in full_name_val and "49" not in full_name_val
    results.append(("SSTI-03", "Profile Update Multi-Engine Payload", is_safe, status_code, str(full_name_val)))

    # Restore admin name
    send_request(f"{BASE_URL}/api/auth/profile", method="PATCH", data={"full_name": "Col. Rajesh Barua"}, headers=admin_headers)

    # 4. Test Emergency Contact Creation with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/auth/emergency-contacts",
        method="POST",
        data={"name": "Contact " + jinja_payload, "relationship": "Rel " + jinja_payload, "phone": "+91 99999-99999"},
        headers=admin_headers
    )
    contact_names = [c.get("name", "") for c in body] if isinstance(body, list) else []
    is_safe = status_code == 200 and any("Contact {{7*7}}" in n and "49" not in n for n in contact_names)
    results.append(("SSTI-04", "Emergency Contact Creation", is_safe, status_code, str(contact_names)))

    # 5. Test Community Report Submission with SSTI description
    status_code, body = send_request(
        f"{BASE_URL}/api/reports",
        method="POST",
        data={
            "zone_id": "HP-01",
            "report_type": "Cracks",
            "description": "Field observation with expression " + jinja_payload + " " + r"${7*7}",
            "location_name": "Nongpoh Sector " + jinja_payload,
            "latitude": 25.90,
            "longitude": 91.88
        },
        headers=admin_headers
    )
    rep_desc = body.get("description", "")
    is_safe = status_code == 201 and "Field observation with expression {{7*7}}" in rep_desc and "49" not in rep_desc
    results.append(("SSTI-05", "Community Report Submission", is_safe, status_code, str(rep_desc)))

    # 6. Test SOS Message Broadcast with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/sos",
        method="POST",
        data={
            "user_name": "Citizen " + jinja_payload,
            "message": "Distress call: " + jinja_payload + " people stranded",
            "latitude": 25.57,
            "longitude": 91.89,
            "injury_severity": "MODERATE",
            "people_count": 4
        },
        headers=admin_headers
    )
    sos_msg = body.get("message", "")
    is_safe = status_code == 201 and "Distress call: {{7*7}}" in sos_msg and "49" not in sos_msg
    results.append(("SSTI-06", "SOS Message Broadcast", is_safe, status_code, str(sos_msg)))

    # 7. Test Incident Creation with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/incidents",
        method="POST",
        data={
            "title": "Landslide Event " + jinja_payload,
            "district": "Kangra",
            "state": "Himachal Pradesh",
            "description": "Debris flow containing expression " + jinja_payload,
            "severity": "HIGH",
            "latitude": 32.09,
            "longitude": 76.26
        },
        headers=admin_headers
    )
    inc_title = body.get("title", "")
    is_safe = status_code == 201 and "Landslide Event {{7*7}}" in inc_title and "49" not in inc_title
    results.append(("SSTI-07", "Incident Creation Title & Description", is_safe, status_code, str(inc_title)))

    # 8. Test Search & Telemetry Inspection with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/location-intelligence/search",
        method="POST",
        data={"query": "Shillong " + jinja_payload}
    )
    is_safe = status_code == 200 and "49" not in str(body) or "Shillong {{7*7}}" in str(body)
    results.append(("SSTI-08", "Location Intelligence Search Query", is_safe, status_code, str(body)[:60]))

    # 9. Test Forgot Password Payload Reflection
    status_code, body = send_request(
        f"{BASE_URL}/api/auth/forgot-password",
        method="POST",
        data={"email": "victim_" + jinja_payload + "@example.com"}
    )
    is_safe = status_code == 200 and "49" not in str(body)
    results.append(("SSTI-09", "Forgot Password Email Reflection", is_safe, status_code, str(body)))

    # 10. Test Safe Routing Geocode with SSTI payload
    status_code, body = send_request(
        f"{BASE_URL}/api/safe-route/geocode",
        method="POST",
        data={"query": "Guwahati " + jinja_payload}
    )
    is_safe = status_code == 200 and ("49" not in str(body) or "Guwahati {{7*7}}" in str(body))
    results.append(("SSTI-10", "Safe Route Geocode Payload", is_safe, status_code, str(body)[:60]))

    print("\n--- SSTI SECURITY AUDIT RESULTS ---")
    all_passed = True
    for test_id, name, passed, code, response_snippet in results:
        status_str = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"{status_str} {test_id} - {name} (HTTP {code})")
        if not passed:
            print(f"       VULNERABILITY DETECTED! Response: {response_snippet[:150]}")

    print("\n" + "=" * 60)
    print(f"TOTAL AUDITED ENDPOINTS: {len(results)} | PASSED: {sum(1 for r in results if r[2])} | VULNERABLE: {sum(1 for r in results if not r[2])}")
    print("=" * 60)

    if all_passed:
        print("[+] VERDICT: SAFE AGAINST SERVER-SIDE TEMPLATE INJECTION (SSTI)")
        return 0
    else:
        print("[-] VERDICT: VULNERABILITIES DETECTED!")
        return 1

if __name__ == "__main__":
    sys.exit(run_ssti_audit())
