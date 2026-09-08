# LandSafe / LandslideGuard SIH26001 — Deployment Environment Audit

Comparison of Local Development Environment vs Production Deployment Environment.

---

## 1. Environment Variables & API Gateways

### Item: API Base URL / Gateway
- **LOCAL VALUE:** `http://127.0.0.1:8000/api` (via Vite proxy `/api`)
- **PRODUCTION VALUE (VERCEL):** `https://landslideguard-backend.onrender.com/api`
- **EXPECTED VALUE:** Unified API gateway URL accessible from all frontend contexts without mixed-content or path duplication.
- **ACTUAL VALUE (DEPLOYED):** Several components had hardcoded `const API_BASE = '/api'` and `fetch('/api/...')` while Vercel rewrites only handled SPA `index.html`.
- **PROBLEM:** Relative `/api/...` calls on Vercel returned `index.html` (HTTP 200 with HTML) instead of contacting the backend, corrupting JSON deserialization.
- **FIX:**
  1. Added Vercel reverse proxy rewrite: `/api/:path* -> https://landslideguard-backend.onrender.com/api/:path*`.
  2. Standardized all frontend components to consume `import.meta.env.VITE_API_URL` and `apiClient`.

---

### Item: Backend CORS Allowed Origins
- **LOCAL VALUE:** `["http://localhost:5173", "http://127.0.0.1:5173", ...]`
- **PRODUCTION VALUE (RENDER):** `["http://localhost:5173", "http://127.0.0.1:5173"]` (via `render.yaml` `CORS_ORIGINS="*"`)
- **EXPECTED VALUE:** Explicit authorization of the production domain `https://si-h-2026.vercel.app` and all Vercel preview environments (`https://*.vercel.app`).
- **ACTUAL VALUE (DEPLOYED):** In `backend/app/core/config.py`, when `IS_PRODUCTION=True` and `CORS_ORIGINS="*"`, the backend overrode allowed origins to `["http://localhost:5173", "http://127.0.0.1:5173"]`.
- **PROBLEM:** Every cross-origin request from the production frontend browser failed with `Access-Control-Allow-Origin: None`, causing the browser to reject all API data.
- **FIX:** Updated `backend/app/core/config.py` and `backend/app/main.py` with `_DEFAULT_ORIGINS` including `https://si-h-2026.vercel.app` and configured Starlette `allow_origin_regex=r"^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$"`.

---

## 2. Infrastructure & Routing Matrix

| Dimension | Local Development | Production (Vercel + Render) | Status Post-Fix |
| :--- | :--- | :--- | :--- |
| **Frontend Host** | `http://127.0.0.1:5177` (Vite Dev Server) | `https://si-h-2026.vercel.app` (Vercel Edge Network) | PASS |
| **Backend Host** | `http://127.0.0.1:8000` (Uvicorn ASGI) | `https://landslideguard-backend.onrender.com` (Render PaaS) | PASS |
| **Protocol** | HTTP / Cleartext | HTTPS / TLS 1.3 (Automated Let's Encrypt) | PASS |
| **API Path Forwarding** | Vite internal proxy in `vite.config.js` | Vercel Edge Serverless Rewrites in `vercel.json` | PASS |
| **CORS Policy** | Allowed by default for localhost ports | Strictly whitelisted for `https://si-h-2026.vercel.app` & Vercel previews | PASS |
| **Database Store** | In-Memory `StateStore` + local SQLite file | In-Memory `StateStore` + ephemeral SQLite instance | PASS |
| **Geocoding Fallback** | Local fallback table + OpenStreetMap | Dual-layer: Backend Geocoder $\rightarrow$ Direct Nominatim Client Fallback | PASS |
| **Weather Telemetry** | Cached Open-Meteo / WMO Satellite Grid | Cached Open-Meteo / WMO Satellite Grid with zero-value `None` coercion | PASS |

---

## 3. Secrets & Configuration Hygiene

- [x] No database passwords, JWT secrets, or private API keys are exposed inside `VITE_` frontend variables.
- [x] JWT Secret generated securely on Render runtime via `generateValue: true` in `render.yaml`.
- [x] Reverse proxy hides backend internal routing and prevents browser-side CORS friction.
- [x] Strict security headers (`nosniff`, `X-Frame-Options: DENY`) enforced on both Vercel edge and FastAPI middleware.
