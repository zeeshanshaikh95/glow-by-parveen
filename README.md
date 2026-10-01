# Glow by Parveen — Website

Mobile-first website for **Glow by Parveen**, a natural/herbal beauty brand.
Primary conversion: browse → cart → **order on WhatsApp** (no payment gateway, by design — see PRD).

> **Real data policy:** no products, prices, ingredients, benefits, reviews or business claims are
> invented in this codebase. Anything pending client input appears as `[CLIENT DATA REQUIRED]`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript, Tailwind CSS 3, React Router 6, react-helmet-async |
| Backend | Node.js + Express 4 + TypeScript, Zod validation |
| Database | MongoDB + Mongoose 8 (Atlas free tier for production) |
| Auth | JWT bearer tokens + bcrypt password hashing, protected `/api/admin/*` routes |
| Security | Helmet, CORS allow-list, rate limiting, input validation, secrets via env |
| Hosting (planned) | GitHub Pages (frontend) + free-tier Node host (API) + MongoDB Atlas |

## Project structure

```
├── client/                 React SPA
│   ├── public/             robots.txt, sitemap.xml, favicon
│   └── src/
│       ├── admin/          Protected admin panel (lazy-loaded bundle)
│       ├── api/            Centralized API client + typed endpoints
│       ├── components/     Reusable UI (ProductCard, MiniCart, Seo, floral accents…)
│       ├── context/        Cart / Settings / Toast providers
│       ├── hooks/          useApi, usePageView
│       ├── lib/            WhatsApp message builder, analytics, formatting
│       └── pages/          Public pages
├── server/
│   └── src/
│       ├── config/         Env config + Mongo connection
│       ├── controllers/    Public + admin route handlers
│       ├── middleware/     Auth (JWT), errors, rate limits, uploads
│       ├── models/         Mongoose schemas
│       ├── routes/         /api and /api/admin routers
│       ├── seed/           Bootstrap (admin account + settings only — no fake catalogue)
│       ├── services/       Settings singleton service
│       ├── utils/          asyncHandler, query helpers
│       └── validation/     Zod schemas for every write
└── docs/DEPLOYMENT.md      Free-tier deployment guide
```

## Quick start (local demo)

**Prerequisites:** Node 20+ and MongoDB — either a local/Atlas instance you already have, or the
bundled dev database (no installation required, see below).

```bash
# 1 — install
npm install                        # installs client + server workspaces

# 2 — configure the server
cp .env.example server/.env
# → edit server/.env: set MONGODB_URI, JWT_SECRET (long random string),
#   ADMIN_EMAIL and ADMIN_PASSWORD before any real deployment.

# 3 — start a database (skip if you already run MongoDB / use Atlas)
npm run dev:db                     # downloads and runs a real mongod on 127.0.0.1:27017
                                   # with data persisted in server/.data/mongo

# 4 — bootstrap the database (admin account + settings; the catalogue stays EMPTY)
npm run seed                       # or: npm run seed:reset to clear test records first

# 5 — run the API and the client
npm run dev
# Client: http://localhost:5173     API: http://localhost:4000/api/health
```

`npm run dev:all` runs the dev database, API and client together in one terminal.

**Admin panel:** `http://localhost:5173/admin` → login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

The first admin is bootstrapped by `npm run seed` from those environment variables (stored as a
bcrypt hash only — never hardcoded, logged or exposed by the API). A freshly bootstrapped account
keeps `mustChangePassword` set, so the first login forces a password change before the panel can be
used; re-running `npm run seed` re-arms the requirement while the bootstrap password is still in use.
A discreet "Admin Login" link in the public site footer opens the login page.

### Demo checklist

- Home: hero, category cards, bestsellers, featured, reviews, Instagram gallery, final WhatsApp CTA
- Shop: search / category filter / sort; Category & Product pages with variants + gallery lightbox
- Cart: add multiple products → mini-cart drawer → **Order on WhatsApp** generates a personalized
  pre-filled message (items, variants, quantities, displayed prices, estimated total)
- Admin: login, product CRUD (+ images, variants, bestseller/featured/out-of-stock, SEO),
  category CRUD + reorder, review moderation, gallery manager, settings (WhatsApp number +
  message templates), dashboard analytics with 7/30/90-day ranges

> **WhatsApp note:** all WhatsApp buttons stay disabled until the business number is set in
> **Admin → Settings**. `wa.me` deep links are generated only from that number — a placeholder
> number is never used.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run API + client together (concurrently) |
| `npm run dev:all` | Dev database + API + client in one command |
| `npm run dev:db` | Local dev MongoDB (persistent data in `server/.data/mongo`) |
| `npm run dev:server` / `npm run dev:client` | Run one side |
| `npm run build` | Typecheck + build both workspaces |
| `npm run typecheck` | TypeScript project-wide |
| `npm run seed` / `npm run seed:reset` | Seed database (optionally wiping catalogue data) |
| `npm run catalogue:import` | Import the client-confirmed products (idempotent, never overwrites; adds them unpublished for review) |
| `npm run brand:assets -- <logo.png>` | Re-derive brand assets (transparent logo, favicons, OG image) |
| `node server/scripts/api-smoke.mjs` | End-to-end API test (78 checks: public + admin CRUD + auth + first-login rotation) |

### Verifying the API end-to-end

The smoke test runs against an EMPTY database: it creates its own clearly marked
`[SMOKE TEST]` records, exercises every public endpoint, admin authorization and all admin
CRUD surfaces, then deletes everything it created (including if it crashes):

```bash
node server/scripts/api-smoke.mjs
# ADMIN_EMAIL=… ADMIN_PASSWORD=… API_URL=https://api.example.com node server/scripts/api-smoke.mjs
```

## Environment variables

See [.env.example](.env.example) — copied to `server/.env` (never committed):

| Variable | Purpose |
|---|---|
| `PORT` | API port (4000) |
| `MONGODB_URI` | Mongo connection string (local or Atlas) |
| `JWT_SECRET` | Long random secret for signing admin JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (12h) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `PUBLIC_SITE_URL` | Frontend URL (canonical/OG defaults) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin account (seed only) |

Client build-time vars (optional): `VITE_BASE` (GitHub Pages sub-path), `VITE_PUBLIC_SITE_URL`.

## Brand assets & colours

The client's **official logo is the primary brand identity** and is never redrawn, recoloured or
stretched. The original file is committed untouched at
[client/public/brand/glow-by-parveen-logo.png](client/public/brand/glow-by-parveen-logo.png).

Derived variants are generated by [scripts/brand-assets.mjs](scripts/brand-assets.mjs)
(`npm run brand:assets -- <path-to-logo.png>`), which only prepares the asset — it does not alter
the artwork:

| Asset | Purpose |
|---|---|
| `brand/glow-by-parveen-logo.png` | Original, byte-for-byte as supplied |
| `brand/glow-by-parveen-logo-transparent.png` | Flat pink background removed — used on white surfaces (footer, admin) |
| `brand/glow-by-parveen-logo-trimmed.png` | Background removed + empty padding trimmed — used in the navbar |
| `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` | Mark on opaque logo pink |
| `og-image.png` | 1200×630 social sharing image |

The colour system is **derived from the logo**: the sampled logo pink (`#FFCFED`) is `brand-200`,
so tints and surfaces match the artwork exactly, with white as the primary background and
near-black (`#141414`) body text. See [client/tailwind.config.js](client/tailwind.config.js).

Logo placement: navbar (mobile + desktop), footer, admin login and admin topbar, favicon/app icons
and Open Graph metadata. Aspect ratio is always preserved.

## Security notes

- Passwords: bcrypt (12 rounds); never stored or logged in plaintext.
- Every `/api/admin/*` request requires a valid JWT; tokens of deleted admins are rejected.
- Login rate-limited (10 attempts / 15 min); analytics + uploads separately limited.
- Zod validation on all writes; Mongo validation as a second layer.
- Central error handler never leaks stack traces; CORS restricted via env in production.
- Admin UI is code-split and route-guarded, but **security is enforced server-side only**.

## Where real client data goes

| Data | Where it is set |
|---|---|
| Products, prices, images, variants | Admin → Products (the catalogue stays empty until then) |
| Categories | Admin → Categories |
| Reviews | Admin → Reviews (approved status required to display) |
| WhatsApp number, Instagram, email, Maps | Admin → Settings |
| Hero / About copy, founder photo | Admin → Settings |
| Logo | ✅ supplied — wired into navbar/footer/admin/favicons via `scripts/brand-assets.mjs` |
| Domain, sitemap host | `client/public/robots.txt`, `client/public/sitemap.xml`, `VITE_PUBLIC_SITE_URL` |

## Roadmap to production

1. Add the real catalogue via the admin panel (products, categories, reviews, gallery).
2. Set WhatsApp number + templates in Admin → Settings.
3. Configure `CORS_ORIGINS`, `JWT_SECRET`, strong admin password on the host.
4. Deploy per [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and confirm shipping/policy pages when the client provides them.
