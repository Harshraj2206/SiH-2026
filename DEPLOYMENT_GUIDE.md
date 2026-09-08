# 🚀 LandslideGuard SIH26001 — Production Deployment Guide

This guide covers the recommended zero-cost and production-grade deployment strategies for the **LandslideGuard SIH26001** application.

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   End Users / Judges   │
                          └───────────┬────────────┘
                                      │ (HTTPS)
                                      ▼
                        ┌───────────────────────────┐
                        │    Frontend Client (SPA)  │
                        │    Hosted on Vercel       │
                        │    (React 18 + Vite)      │
                        └─────────────┬─────────────┘
                                      │ REST API / CORS
                                      ▼
                        ┌───────────────────────────┐
                        │    Backend API Gateway    │
                        │    Hosted on Render       │
                        │    (FastAPI + Uvicorn)    │
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
   │ SQLite DB Store │       │  Open-Meteo &   │       │ Google Places / │
   │ (RBAC & Auth)   │       │  OSRM Routing   │       │ Open Geospatial │
   └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Method 1: Cloud PaaS (Recommended — Vercel + Render)

This approach is **100% free**, requires zero server maintenance, and provides automatic SSL and continuous deployment on every Git push.

### Step 1: Deploy Backend on Render (FastAPI)

1. Go to **[Render.com](https://render.com)** and sign in with your GitHub account.
2. In the Render Dashboard, click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository: `Harshraj2206/SiH-2026` and select the `develop` branch.
4. Render will automatically detect the [`render.yaml`](file:///d:/Visual%20Studio%20Code/Demo2/render.yaml) blueprint file and configure:
   - **Service Name:** `landslideguard-backend`
   - **Runtime:** Python 3.10
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:** Automatically sets `ENVIRONMENT=production`, generates a secure `JWT_SECRET`, and sets `DATABASE_PATH`.
5. Click **Apply**.
6. Once the build finishes (usually 1–2 minutes), your backend will be live at a URL like:
   `https://landslideguard-backend.onrender.com`
7. Test it by opening:
   - `https://landslideguard-backend.onrender.com/api/health` $\rightarrow$ `{"status": "healthy"}`
   - `https://landslideguard-backend.onrender.com/docs` $\rightarrow$ Interactive Swagger UI

---

### Step 2: Deploy Frontend on Vercel (React + Vite)

1. Go to **[Vercel.com](https://vercel.com)** and sign in with your GitHub account.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your repository: `Harshraj2206/SiH-2026`.
4. In the configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and choose **`frontend`**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
5. Under **Environment Variables**, add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://landslideguard-backend.onrender.com/api`  
     *(Replace with your actual Render backend URL + `/api`)*
6. Click **Deploy**.
7. Vercel will build the project in ~30 seconds using the pre-configured [`frontend/vercel.json`](file:///d:/Visual%20Studio%20Code/Demo2/frontend/vercel.json) (which handles SPA route rewrites for `/risk-map`, `/safe-route`, `/resources`, etc.).
8. Your application is now live on an HTTPS domain (e.g., `https://sih-2026.vercel.app`)!

---

## Method 2: Docker & Docker Compose (VPS / Self-Hosted)

For running on an Ubuntu VPS, AWS EC2, or local Docker Desktop:

### 1. Prerequisites
- Install Docker and Docker Compose:
  ```bash
  sudo apt-get update && sudo apt-get install -y docker.io docker-compose
  ```

### 2. Launch Services
From the root of the project directory:
```bash
# Build images and start containers in the background
docker-compose up --build -d

# Check running containers
docker-compose ps

# View backend logs
docker-compose logs -f backend
```

- **Frontend App:** `http://<your-server-ip>`
- **Backend API:** `http://<your-server-ip>:8000/api`
- **Swagger Documentation:** `http://<your-server-ip>:8000/docs`

---

## Environment Variables Reference

| Variable Name | Component | Default / Production Value | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Frontend | `https://<backend-domain>/api` | API Gateway URL for all client requests |
| `ENVIRONMENT` | Backend | `production` | Enables hardened security, cookies, and rate limiting |
| `JWT_SECRET` | Backend | *(Cryptographically random string)* | Secret used to sign authentication JWT tokens |
| `DATABASE_PATH` | Backend | `data/landslideguard_users.db` | SQLite database file location |
| `CORS_ORIGINS` | Backend | `*` (or specific frontend domain) | Allowed origins for cross-origin API calls |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | `10080` (7 days) | JWT session token validity duration |

---

## Production Security Notes

1. **HTTPS Required for Geolocation**:
   Both Vercel and Render automatically provide free SSL certificates (`https://`). Browsers require HTTPS to access `navigator.geolocation` for real-time nearby hospitals, police stations, and in-app emergency routing.
2. **Database Persistence on Free PaaS**:
   On Render's free tier, the local SQLite database resets if the service restarts due to inactivity. For long-term persistent accounts, attach a 1 GB Persistent Disk on Render or configure PostgreSQL.
