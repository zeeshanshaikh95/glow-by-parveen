# Deployment Guide (free-tier friendly)

The stack splits into three independently deployable pieces:

```
GitHub Pages (static React build)
        │  HTTPS fetch /api/*
        ▼
Render free web service (Express API)
        │  Mongoose
        ▼
MongoDB Atlas M0 (free, permanent)
```

## 1. MongoDB Atlas (free M0)

1. Create a free M0 cluster (any region), a database user, and a database named
   `glow-by-parveen`.
2. Network access: add `0.0.0.0/0` (Allow access from anywhere) — Render's free
   tier uses egress IPs that cannot be allowlisted individually.
3. Copy the connection string (`mongodb+srv://user:pass@cluster…/glow-by-parveen`)
   → used as `MONGODB_URI` in step 2. It is stored only in the Render dashboard,
   never in git.

## 2. Backend (Render free web service)

**Option A — Blueprint (recommended):** Render dashboard → New + → Blueprint →
pick this repo. Render reads `render.yaml` (rootDir `server`, health check
`/api/health`, auto-deploy on push). Fill in the `sync: false` values in the
dashboard: `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_API_URL`
(leave JWT_SECRET alone — Render generates it).

**Option B — manual:** create a Web Service with the same settings as the
blueprint: root directory `server`, build `npm ci && npm run build`, start
`npm start`, health check `/api/health`, and the env vars below.

- **Health check:** `GET /api/health`
- **Environment variables:**

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (secret — dashboard only) |
| `JWT_SECRET` | long random string (Render can generate it) |
| `CORS_ORIGINS` | `https://zeeshanshaikh95.github.io,http://localhost:5173` |
| `PUBLIC_SITE_URL` | `https://zeeshanshaikh95.github.io/glow-by-parveen` |
| `PUBLIC_API_URL` | `https://<service>.onrender.com` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first-admin bootstrap credentials (bcrypt-hashed, never logged; first login forces a password change) |
| `AUTO_SEED` | `true` — bootstraps admin + settings on boot (idempotent, never touches the catalogue) |

- **Uploads note:** disk storage is fine for a demo; on Render's ephemeral disk,
  switch `client/src/api/client.ts uploadImages()` + the `/uploads` route to
  Cloudinary (free tier) so images survive redeploys. No other code changes
  needed — image fields accept any URL.

## 3. Frontend (GitHub Pages)

Fully automated: `.github/workflows/deploy-pages.yml` builds and deploys on
every push to `main` that touches the client.

- **API URL wiring:** set the repository variable `VITE_API_BASE_URL`
  (Settings → Secrets and variables → Actions → Variables) to the Render URL,
  e.g. `https://glow-by-parveen-api.onrender.com`. The workflow passes it to
  Vite at build time. Until it is set, the site falls back to
  `http://localhost:4000` (dev demo mode).
- SPA deep links resolve through `404.html` (copied by the workflow).
- `robots.txt` / `sitemap.xml` / static OG tags already point at the Pages URL;
  swap in a custom domain there if one is purchased later.

## 4. Post-deploy checklist

- [ ] `https://<api>/api/health` returns `{"ok":true}`
- [ ] Admin login works from the Pages domain (CORS)
- [ ] WhatsApp number set in Admin → Settings; test a cart order message
- [ ] All placeholder `[CLIENT DATA REQUIRED]` items replaced with approved copy
- [ ] Admin password changed from the seeded value (forced on first login)
- [ ] Catalogue still empty — real client data only, entered via /admin
