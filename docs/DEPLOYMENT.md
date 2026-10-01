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

1. Sign up at <https://cloud.mongodb.com> (Google sign-in works) and create a
   **Free M0** cluster — pick the provider/region closest to the audience.
   Atlas may call it “Atlas free” / “M0 Sandbox”; both are the free tier.
2. Atlas’s setup wizard asks for the same two things under **Security**:
   - **Database Access** → add a user (e.g. `glowapp`) with
     *Autogenerate Secure Password* — copy the password somewhere safe.
   - **Network Access** → *Allow access from anywhere* (`0.0.0.0/0`). Render’s
     free tier uses rotating egress IPs that cannot be allowlisted individually.
3. Clusters → **Connect** → *Drivers* → *Node.js* → copy the connection string
   (`mongodb+srv://glowapp:<password>@cluster….mongodb.net`), substitute the
   generated password, and append the database name:
   `…mongodb.net/glow-by-parveen?retryWrites=true&w=majority`.
   This becomes `MONGODB_URI` in step 2 — stored only in the Render dashboard,
   never in git.

## 2. Backend (Render free web service)

**Option A — Blueprint (recommended):** Render dashboard → New + → Blueprint →
pick this repo. Render reads `render.yaml` (rootDir `server`, health check
`/api/health`, auto-deploy on push). Fill in the `sync: false` values in the
dashboard: `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(leave JWT_SECRET alone — Render generates it).

**Option B — manual:** create a Web Service with the same settings as the
blueprint: root directory `server`, build `npm ci && npm run build`, start
`npm start`, health check `/api/health`, and the env vars below.

The service URL is assigned at creation time (`https://<service>.onrender.com`)
— no public URL has to be known in advance; the API derives nothing from it.

- **Health check:** `GET /api/health`
- **Environment variables:**

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (secret — dashboard only) |
| `JWT_SECRET` | long random string (Render can generate it) |
| `CORS_ORIGINS` | `https://zeeshanshaikh95.github.io,http://localhost:5173` |
| `PUBLIC_SITE_URL` | `https://zeeshanshaikh95.github.io/glow-by-parveen` |
| `PUBLIC_API_URL` | optional — reserved; the API serves relative `/uploads` URLs and the client resolves them against `VITE_API_BASE_URL` |
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
  Vite at build time, and there is deliberately no localhost fallback: an
  unset variable produces same-origin relative calls (fail loudly) rather than
  a production bundle that points at a developer machine.
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
