# LANDSLIDEGUARD SIH26001 — SSTI & Dynamic Template Security Report

## 1. Executive Summary

A comprehensive Server-Side Template Injection (SSTI) and dynamic evaluation security audit was performed across the entire LANDSLIDEGUARD SIH26001 codebase.

- **SSTI Engine Detected:** **NO**
- **Template Engine:** **NONE** (Pure FastAPI REST backend serving JSON + React SPA frontend)
- **Confirmed SSTI Vulnerabilities:** **NO**
- **Unsafe Dynamic Template Construction:** **NO**
- **eval() / exec() on User Input:** **NO**
- **Unsafe HTML Rendering (`dangerouslySetInnerHTML`, `innerHTML`):** **NO**
- **Automated SSTI Test Suite Results:** **10 / 10 PASSED (0 VULNERABLE)**
- **Full System Regression Suite:** **29 / 29 PASSED**
- **Final Status:** **SAFE AGAINST IDENTIFIED SSTI PATHS**

---

## 2. Server-Side Template Engine & Architecture Audit

### 2.1 Backend Architecture
The backend is built as a pure JSON-RPC / REST API using **FastAPI** and **Pydantic v2**:
- Dependencies audited in [`backend/requirements.txt`](file:///d:/Visual%20Studio%20Code/Demo2/backend/requirements.txt): `fastapi`, `uvicorn`, `pydantic`, `scikit-learn`, `pandas`, `numpy`, `joblib`, `networkx`, `shapely`, `PyJWT`, `passlib`, `python-multipart`.
- **Zero server-side rendering engines** (Jinja2, Starlette Templates, Mako, Django templates, EJS, Pug, Handlebars) are installed or imported.
- All endpoints return typed Pydantic models serialized strictly as JSON data via FastAPI's `JSONResponse`.

### 2.2 Dynamic Evaluation Audit
A global codebase scan was conducted for dynamic Python evaluators:
- `eval()`: **0 matches** in `backend/`
- `exec()`: **0 matches** in `backend/`
- `compile()`: **0 matches** in `backend/`
- `render()` / `render_template_string()` / `from_string()`: **0 matches** in `backend/`

---

## 3. User-Controlled Input Trace Analysis

Every user-controlled input surface was audited and traced from ingress to response:

| User Input Field | Endpoint & Method | Processing Flow | Output Context | SSTI Potential |
| :--- | :--- | :--- | :--- | :--- |
| **Login Identifier** | `POST /api/auth/login` | Pydantic validation $\rightarrow$ SQLite parameterized query $\rightarrow$ bcrypt check | JSON Error / Token | **NONE (Data only)** |
| **User Registration** | `POST /api/auth/register` | Pydantic validation $\rightarrow$ SQLite parameterized insertion | JSON Profile Data | **NONE (Data only)** |
| **User Profile Name** | `PATCH /api/auth/profile` | Pydantic validation $\rightarrow$ SQLite parameterized update | JSON Profile Data | **NONE (Data only)** |
| **Emergency Contact** | `POST /api/auth/emergency-contacts` | Pydantic validation $\rightarrow$ JSON array serial in SQLite | JSON Contact List | **NONE (Data only)** |
| **Community Report** | `POST /api/reports` | Pydantic validation $\rightarrow$ Store append $\rightarrow$ ML fusion | JSON Report Object | **NONE (Data only)** |
| **SOS Message** | `POST /api/sos` | Pydantic validation $\rightarrow$ Triage queue insertion | JSON SOS Object | **NONE (Data only)** |
| **Incident Description** | `POST /api/incidents` | Pydantic validation $\rightarrow$ Event catalog insertion | JSON Incident Object | **NONE (Data only)** |
| **Search Query** | `POST /api/location-intelligence/search` | Geocoding string matching $\rightarrow$ Nominatim client | JSON Location List | **NONE (Data only)** |
| **Forgot Password Email**| `POST /api/auth/forgot-password` | Pydantic validation $\rightarrow$ Token generation | Generic JSON message | **NONE (Data only)** |
| **Safe Route Query** | `POST /api/safe-route/geocode` | String geocoding query $\rightarrow$ Coordinate resolution | JSON Waypoint List | **NONE (Data only)** |

---

## 4. Frontend & Map Popups Audit

- Audited `frontend/src/`:
  - `dangerouslySetInnerHTML`: **0 matches**
  - `innerHTML`: **0 matches**
  - `document.write`: **0 matches**
- In [`LeafletRiskMap.jsx`](file:///d:/Visual%20Studio%20Code/Demo2/frontend/src/components/map/LeafletRiskMap.jsx), all Map popups (incidents, SOS distress markers, community reports, relief shelters, hospitals) are rendered exclusively via declarative React `<Popup>` JSX components. React automatically performs HTML character escaping on all dynamic data bindings, preventing DOM-based injection.

---

## 5. Automated SSTI Test Suite Results

Harmless multi-engine template payloads (`{{7*7}}`, `${7*7}`, `<%= 7*7 %>`, `#{7*7}`) were executed against all live endpoints:

```
============================================================
LANDSLIDEGUARD SIH26001 - SSTI & EVALUATION SECURITY AUDIT SUITE
============================================================

--- SSTI SECURITY AUDIT RESULTS ---
[PASS] SSTI-01 - Login Identifier Payload (HTTP 401)
[PASS] SSTI-02 - User Registration (full_name) (HTTP 201)
[PASS] SSTI-03 - Profile Update Multi-Engine Payload (HTTP 200)
[PASS] SSTI-04 - Emergency Contact Creation (HTTP 200)
[PASS] SSTI-05 - Community Report Submission (HTTP 201)
[PASS] SSTI-06 - SOS Message Broadcast (HTTP 201)
[PASS] SSTI-07 - Incident Creation Title & Description (HTTP 201)
[PASS] SSTI-08 - Location Intelligence Search Query (HTTP 200)
[PASS] SSTI-09 - Forgot Password Email Reflection (HTTP 200)
[PASS] SSTI-10 - Safe Route Geocode Payload (HTTP 200)

============================================================
TOTAL AUDITED ENDPOINTS: 10 | PASSED: 10 | VULNERABLE: 0
============================================================
[+] VERDICT: SAFE AGAINST SERVER-SIDE TEMPLATE INJECTION (SSTI)
```

In all 10 test cases, payload strings remained literal character sequences and were **never evaluated as template code or mathematical expressions** (e.g. `49`).

---

## 6. Full Regression Verification

```
=================== SUMMARY ===================
Total Verifications: 29 | PASSED: 29 | FAILED: 0
```
- **Backend Service:** `http://127.0.0.1:8000` (FastAPI / Uvicorn)
- **Frontend Service:** `http://127.0.0.1:5173` (Vite SPA)
