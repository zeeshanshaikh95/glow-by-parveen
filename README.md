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
│       ├── seed/           Seed script with [CLIENT DATA REQUIRED] placeholders
│       ├── services/       Settings singleton service
│       ├── utils/          asyncHandler, query helpers
│       └── validation/     Zod schemas for every write
└── docs/DEPLOYMENT.md      Free-tier deployment guide
```

## Quick start (local demo)

**Prerequisites:** Node 20+, and MongoDB running locally (`mongodb://127.0.0.1:27017`) or an Atlas URI.

```bash
# 1 — install
npm install                        # root tooling (concurrently)
npm install --workspaces           # client + server deps

# 2 — configure the server
cp .env.example server/.env
# → edit server/.env: set MONGODB_URI, JWT_SECRET (long random string),
#   ADMIN_EMAIL and ADMIN_PASSWORD before any real deployment.

# 3 — seed the database (idempotent; creates admin + placeholder catalogue)
npm run seed                       # or: npm run seed:reset to wipe catalogue data first

# 4 — run both apps
npm run dev
# Client: http://localhost:5173     API: http://localhost:4000/api/health
```

**Admin panel:** `http://localhost:5173/admin` → login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

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
| `npm run dev:server` / `npm run dev:client` | Run one side |
| `npm run build` | Typecheck + build both workspaces |
| `npm run typecheck` | TypeScript project-wide |
| `npm run seed` / `npm run seed:reset` | Seed database (optionally wiping catalogue data) |

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
| Products, prices, images, variants | Admin → Products (or bulk import via seed script — see docs) |
| Categories | Admin → Categories |
| Reviews | Admin → Reviews (approved status required to display) |
| WhatsApp number, Instagram, email, Maps | Admin → Settings |
| Hero / About copy, founder photo | Admin → Settings |
| Logo | `client/public/` + header (currently floral SVG placeholder) |
| Domain, sitemap host | `client/public/robots.txt`, `client/public/sitemap.xml`, `VITE_PUBLIC_SITE_URL` |

## Roadmap to production

1. Replace seeded `[CLIENT DATA REQUIRED]` catalogue via admin panel or seed import.
2. Set WhatsApp number + templates in Admin → Settings.
3. Configure `CORS_ORIGINS`, `JWT_SECRET`, strong admin password on the host.
4. Deploy per [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and confirm shipping/policy pages when the client provides them.
