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
   generated password (URL-encode it first if it contains any of
   `@ : / ? # [ ] %`), and append the database name **and `authSource=admin`**:
   `…mongodb.net/glow-by-parveen?authSource=admin&retryWrites=true&w=majority`.
   `authSource=admin` is required — Atlas stores database users in `admin`,
   but a database name in the path makes the driver authenticate against
   *that* database instead, and Atlas then rejects the login with
   `code 8000 / bad auth : authentication failed` even though the username
   and password are correct.
   This becomes `MONGODB_URI` in step 2 — stored only in the Render dashboard,
   never in git.

## 2. Backend (Render free web service)

**Option A — Blueprint (recommended):** Render dashboard → New + → Blueprint →
pick this repo. Render reads `render.yaml` (rootDir `server`, health check
`/api/health`, auto-deploy on push). Fill in the `sync: false` values in the
dashboard: `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(leave JWT_SECRET alone — Render generates it).

**Option B — manual:** create a Web Service with the same settings as the
blueprint: root directory `server`, build
`MONGOMS_DISABLE_POSTINSTALL=1 npm ci --include=dev && npm run build`
(`--include=dev` is required — Render builds with `NODE_ENV=production`, which
otherwise skips the TypeScript toolchain), start
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
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (e.g. `<cloud-name>`) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (e.g. `<api-key>`) |
| `CLOUDINARY_API_SECRET` | **secret — dashboard only**, never committed or sent to the browser |
| `CLOUDINARY_FOLDER` | optional, default `glow-by-parveen` |
| `UPLOAD_MAX_BYTES` / `UPLOAD_MAX_FILES` | optional, default `8388608` (8 MB) / `10` |

- **Uploads:** without the `CLOUDINARY_*` variables the API still boots and
  stores uploads on local disk (`server/uploads`, ephemeral on Render).
  Configure Cloudinary to keep images across redeploys — see section 3.

## 3. Image storage (Cloudinary)

All images are uploaded **through the API**, never from the browser directly:
`POST /api/admin/uploads` (admin JWT required) validates the file and stores it
in Cloudinary with the server-side credentials. The API key and secret therefore
never reach the frontend, the Git repo, `VITE_*` variables, logs or responses.

**Local development**

1. In `server/.env` (git-ignored) set:

   ```dotenv
   CLOUDINARY_CLOUD_NAME=<cloud name>
   CLOUDINARY_API_KEY=<API key>
   CLOUDINARY_API_SECRET=<API secret — Cloudinary Console → Settings → API Keys>
   CLOUDINARY_FOLDER=glow-by-parveen
   ```

   The cloud name and API key are already in the local `server/.env`; only the
   secret has to be pasted in. Real values stay out of git — this guide and
   `.env.example` use placeholders.

2. Verify the credentials and a real upload/delete round trip:

   ```bash
   npm run media:check -w server
   ```

   The check pings Cloudinary, uploads a generated 1×1 test PNG, verifies the
   `secure_url` → `public_id` round trip and deletes it again. It never touches
   the database or site content. Leave `CLOUDINARY_API_SECRET` blank to keep the
   local-disk fallback.

3. Start the API and open `http://localhost:5173/admin` → **Products / Gallery /
   Settings** → *Upload images*. Uploaded files appear under the
   `glow-by-parveen` folder in the Cloudinary Media Library.

**Render (when backend deployment is handled)**

Add the same three variables in the Render dashboard (Service → Environment),
keeping `CLOUDINARY_API_SECRET` as a dashboard-only secret. Nothing in
`render.yaml` needs to change — `start`/`build` are unchanged, and the
integration activates as soon as the variables are present.

**How assets are stored**

- The existing schema still holds the URL string (`product.images[]`,
  `galleryItem.image`, `siteSettings.hero.imageUrl`,
  `siteSettings.about.founderImageUrl`, …).
- The Cloudinary `public_id` is saved next to it on the same document
  (`product.imagePublicIds[]`, `galleryItem.imagePublicId`,
  `siteSettings.hero.imagePublicId`, …) and in the `mediaassets` registry
  collection, which maps every `secure_url` ↔ `public_id` pair.
- Replacing or deleting an image destroys the old Cloudinary asset **only when
  no product / category / review / gallery item / settings document references
  it any more** (shared images are kept). Legacy `/uploads/...` files are never
  touched. `DELETE /api/admin/uploads` performs the same reference-checked
  deletion on demand.

**Limits** — JPG, JPEG, PNG or WebP; 8 MB per file and 10 files per request by
default (override with `UPLOAD_MAX_BYTES` / `UPLOAD_MAX_FILES`). Files are also
checked against their magic bytes, so a renamed non-image is rejected.

## 4. Frontend (GitHub Pages)

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

## 5. Post-deploy checklist

- [ ] `https://<api>/api/health` returns `{"ok":true}`
- [ ] Admin login works from the Pages domain (CORS)
- [ ] WhatsApp number set in Admin → Settings; test a cart order message
- [ ] All placeholder `[CLIENT DATA REQUIRED]` items replaced with approved copy
- [ ] `CLOUDINARY_*` set on Render and `npm run media:check -w server` passes locally
- [ ] An uploaded image loads from `res.cloudinary.com` on the Pages site
- [ ] Admin password changed from the seeded value (forced on first login)
- [ ] Catalogue still empty — real client data only, entered via /admin
