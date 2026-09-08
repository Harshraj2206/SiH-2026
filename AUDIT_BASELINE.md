# LANDSLIDEGUARD — CODEBASE AUDIT BASELINE

**Date:** 2026-09-08  
**Branch:** `develop`  
**Initial Commit:** `7b3faedc2f71014014d4a7dedadc33ea7aca6ce2`  
**Auditor:** CodeRabbit + Antigravity Engineering System

---

## 1. Application Startup Status

| Component | Port | Status | Process / Task | Notes |
|---|:---:|:---:|:---:|---|
| **Backend (FastAPI)** | `8000` | **ONLINE** | `python backend/run_server.py` (`task-931`) | Uvicorn running on `127.0.0.1:8000` |
| **Frontend (Vite / React)** | `5177` | **ONLINE** | `npm run dev -- --port 5177` (`task-1720`) | Vite dev server active on `http://127.0.0.1:5177/` |

---

## 2. Frontend Build Status

- **Command:** `npm run build` (in `frontend/`)
- **Result:** **PASSED** (`built in 9.11s`, Exit code 0)
- **Artifacts:**
  - `dist/index.html`: 1.56 kB
  - `dist/assets/index-BLloYCWJ.css`: 121.22 kB
  - `dist/assets/index-BxFFXzty.js`: 1,195.85 kB (Vite chunk warning > 500kB)

---

## 3. Existing Test Results (Backend Pytest)

- **Command:** `pytest backend/tests/`
- **Total Tests Collected:** 58 items
- **Passed:** 57 items
- **Failed:** 1 item
- **Duration:** 104.35s

### Detailed Suite Breakdown:
1. `backend/tests/test_audit_comprehensive.py` (33 tests): **33 PASSED** (100%)
   - Auth & Registration
   - Prediction Pipeline
   - Risk Zone Telemetry
   - Weather Normalization
   - Alerts & Incidents
   - SOS Dispatch & Nearby Resource Retrieval
2. `backend/tests/test_full_suite.py` (23 tests): **23 PASSED** (100%)
   - User Registration & Duplication Prevention
   - Bearer Authentication & Emergency Contact CRUD
   - RBAC Endpoint Protection
   - Rate Limiting & Security Headers
   - SQL Injection & SSTI Guardrails
3. `backend/tests/test_nearby_resources.py` (1 test): **1 PASSED** (100%)
   - Emergency Facility Radius Filter & Coordinate Accuracy
4. `backend/tests/test_in_app_navigation.py` (1 test): **1 FAILED**
   - **Root Cause:** Tests 4 routes against `/api/safe-route/global`. Routes 1-3 (Hospital 3.1km, Police 5.6km, Fire 28.3km) succeed with rich waypoint instructions. Route 4 tests Karnataka $\rightarrow$ Himachal Pradesh (2,500+ km cross-country road calculation), which exceeds the test's synchronous `timeout=12` seconds, raising `TimeoutError: timed out`.

---

## 4. Existing Console Errors & Runtime Warnings

- **Vite Chunk Size Warning:** JavaScript production bundle is 1.19 MB minified, triggering Vite's bundle-size advisory.
- **Cross-Region Route Latency:** Cross-continental/cross-country road routing (>1,000 km) through public OSRM instances can incur high latency (>12s).

---

## 5. CodeRabbit Availability Determination

- **Environment Scan:**
  - PATH binaries: No standalone `coderabbit` CLI installed.
  - VS Code Extensions: Not listed in local `.vscode/extensions`.
  - Global npm / Pip: Not present locally.
- **Repository Integration:**
  - CodeRabbit functions as a GitHub App / webhook integration on the remote GitHub repository (`Harshraj2206/SiH-2026`).
  - As instructed by Phase 3 ("If CodeRabbit cannot directly execute a particular test or fix, YOU must perform that part yourself using the available development tools"), Antigravity conducts the complete CodeRabbit-grade multi-dimension audit (Correctness, Security, Performance, Reliability, Error Handling, API Contracts, Database, Authentication, RBAC, Frontend, Backend, ML, State Management, Responsive UI, Dependencies, Secrets, Edge Cases) directly on the codebase.

---

## 6. Baseline Summary

The baseline is healthy and operational (frontend builds, dev servers are running, 57 of 58 automated tests pass), with 1 known timeout issue in cross-country route test and opportunities for security, performance, error handling, and dependency hardening.
