# Deployment Guide (free-tier friendly)

The stack splits into three independently deployable pieces:

```
GitHub Pages (static React build)
        │  HTTPS fetch /api/*
        ▼
Free-tier Node host (Express API)
        │  Mongoose
        ▼
MongoDB Atlas M0 (free)
```

## 1. MongoDB Atlas (free M0)

1. Create a free cluster (M0), a database user, and allow your host's IP.
2. Copy the connection string → `MONGODB_URI` on the API host.
3. Run the seed once against Atlas from your machine:
   ```bash
   MONGODB_URI="mongodb+srv://…" npm run seed
   ```

## 2. Backend (any free-tier Node host)

Works on Render / Railway / Fly.io / Glitch free tiers (check current limits).

- **Start command:** `cd server && npm ci && npm run build && npm start`
- **Health check:** `GET /api/health`
- **Environment:** all variables from `.env.example` — set real values:
  - `JWT_SECRET` — long random string (required)
  - `CORS_ORIGINS` — e.g. `https://<user>.github.io,https://<custom-domain>`
  - `PUBLIC_SITE_URL` / `PUBLIC_API_URL` — real URLs
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — initial bootstrap credentials only: the first seed creates
    the admin from these (bcrypt-hashed, never hardcoded or logged) and flags the account so the
    first login forces a password change; rotate via the forced first-login flow
- **Uploads note:** disk storage is fine for a demo; on ephemeral hosts switch
  `client/src/api/client.ts uploadImages()` + the `/uploads` route to Cloudinary
  (free tier) so images survive redeploys. No code changes needed elsewhere —
  image fields accept any URL.

## 3. Frontend (GitHub Pages)

```bash
# from repo root
VITE_BASE=/glow-by-parveen/ npm run build --workspace client
# deploy client/dist to the gh-pages branch (e.g. with `gh-pages -d client/dist`)
```

- Replace `glowbyparveen.example.com` in `client/public/robots.txt` and
  `client/public/sitemap.xml` with the real domain.
- Set `VITE_PUBLIC_SITE_URL` at build time so canonical/OG URLs are correct.
- SPA routing: ensure `404.html` is a copy of `index.html` (standard gh-pages SPA trick)
  so deep links like `/product/slug` resolve.

## 4. Post-deploy checklist

- [ ] `https://<api>/api/health` returns `{"ok":true}`
- [ ] Admin login works from the Pages domain (CORS)
- [ ] WhatsApp number set in Admin → Settings; test a cart order message
- [ ] All placeholder `[CLIENT DATA REQUIRED]` items replaced with approved copy
- [ ] sitemap.xml / robots.txt updated with the real domain
- [ ] Admin password changed from the seeded value
