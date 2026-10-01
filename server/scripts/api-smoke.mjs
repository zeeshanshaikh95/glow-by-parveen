/**
 * End-to-end API smoke test.
 *
 * Designed to run against a FRESH, EMPTY database (no seeded catalogue):
 * it creates its own clearly-marked [SMOKE TEST] records, exercises every
 * public endpoint, admin authentication/authorization and all admin CRUD
 * surfaces, then deletes everything it created — including on failure.
 *
 *   node scripts/api-smoke.mjs
 *   API_URL=https://api.example.com ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/api-smoke.mjs
 *
 * Exits non-zero on the first failed expectation, so it can gate deployments.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load server/.env (ADMIN_EMAIL / ADMIN_PASSWORD) regardless of the cwd the
// script is invoked from. Explicit environment variables still take priority.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@glowbyparveen.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'GlowDemo!2026';
/**
 * Deterministic temporary password used to clear the first-login
 * mustChangePassword flag during the run. It is deterministic so a run that
 * crashes mid-rotation can log back in and restore the original password.
 * Never the real bootstrap secret — the original password is restored at the end.
 */
const ROTATED = 'SmokeRotate!2026';

const MARK = '[SMOKE TEST]';
let usingRotated = false; // true while the account's current password is ROTATED

let passed = 0;
const failures = [];
const created = { products: [], categories: [], reviews: [], gallery: [] };

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const productPayload = (overrides = {}) => ({
  name: `${MARK} Product — created by api-smoke.mjs`,
  slug: 'smoke-test-product',
  description: `${MARK} automated end-to-end check`,
  price: 123,
  compareAtPrice: 150,
  size: '1 unit',
  category: null,
  images: [],
  ingredients: [`${MARK} ingredient`],
  benefits: [`${MARK} benefit`],
  howToUse: `${MARK} instructions`,
  warnings: '',
  variants: [
    { name: 'Variant A', price: 123, stockStatus: 'in_stock' },
    { name: 'Variant B', price: 199, stockStatus: 'out_of_stock' },
  ],
  stockStatus: 'in_stock',
  bestseller: true,
  featured: false,
  seoTitle: `${MARK} SEO title`,
  seoDescription: `${MARK} SEO description`,
  displayOrder: 999,
  archived: false,
  ...overrides,
});

/** Tries PASSWORD first, then ROTATED (recovers a run that crashed mid-rotation). */
async function tryLogin() {
  const primary = await req('/api/admin/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  if (primary.status === 200 && primary.data?.token) {
    return { token: primary.data.token, admin: primary.data.admin };
  }
  const recovery = await req('/api/admin/auth/login', { method: 'POST', body: { email: EMAIL, password: ROTATED } });
  if (recovery.status === 200 && recovery.data?.token) {
    usingRotated = true;
    return { token: recovery.data.token, admin: recovery.data.admin };
  }
  return { token: null, admin: null };
}

/** Puts the original password back so the run leaves the credentials untouched. */
async function restorePassword(token) {
  if (!usingRotated) return;
  try {
    await req('/api/admin/auth/password', {
      method: 'PUT',
      token,
      body: { currentPassword: ROTATED, newPassword: PASSWORD },
    });
    usingRotated = false;
    console.log('Original admin password restored.');
  } catch {
    console.log('! Could not restore the original admin password — the account currently uses the smoke-test rotation password.');
  }
}

/** Removes every record this script created. Safe to run repeatedly. */
async function cleanup(token) {
  console.log(`\n${'─'.repeat(60)}\nCleaning up test records…`);
  let removed = 0;

  for (const id of [...created.products, ...created.reviews, ...created.gallery, ...created.categories]) {
    const path = created.products.includes(id)
      ? `/api/admin/products/${id}`
      : created.reviews.includes(id)
        ? `/api/admin/reviews/${id}`
        : created.gallery.includes(id)
          ? `/api/admin/gallery/${id}`
          : `/api/admin/categories/${id}`;
    try {
      const res = await req(path, { method: 'DELETE', token });
      if (res.status === 200) removed++;
    } catch {
      /* best effort */
    }
  }

  // Safety net: sweep any leftovers carrying the marker.
  const [products, categories, reviews, gallery] = await Promise.all([
    req('/api/admin/products', { token }),
    req('/api/admin/categories', { token }),
    req('/api/admin/reviews', { token }),
    req('/api/admin/gallery', { token }),
  ]);

  for (const p of products.data?.products ?? []) {
    if (p.name?.includes(MARK)) {
      await req(`/api/admin/products/${p._id}`, { method: 'DELETE', token });
      removed++;
    }
  }
  for (const c of categories.data?.categories ?? []) {
    if (c.name?.includes(MARK)) {
      await req(`/api/admin/categories/${c._id}`, { method: 'DELETE', token });
      removed++;
    }
  }
  for (const r of reviews.data?.reviews ?? []) {
    if (r.customerName?.includes(MARK) || r.text?.includes(MARK)) {
      await req(`/api/admin/reviews/${r._id}`, { method: 'DELETE', token });
      removed++;
    }
  }
  for (const g of gallery.data?.items ?? []) {
    if (g.caption?.includes(MARK)) {
      await req(`/api/admin/gallery/${g._id}`, { method: 'DELETE', token });
      removed++;
    }
  }

  console.log(`Removed ${removed} test record(s).`);

  await restorePassword(token);
}

async function main() {
  console.log(`\nGlow by Parveen — API smoke test against ${API_URL}\n`);

  // ── Public endpoints (must work on an empty catalogue) ───────
  console.log('Public endpoints');
  const health = await req('/api/health');
  check('GET /api/health → 200', health.status === 200 && health.data?.ok === true);

  const products = await req('/api/products');
  check(
    'GET /api/products → array (empty catalogue allowed)',
    products.status === 200 && Array.isArray(products.data?.products)
  );
  check(
    'public catalogue never exposes archived products',
    (products.data?.products ?? []).every((p) => p.archived === false)
  );

  const categories = await req('/api/categories');
  check('GET /api/categories → array', categories.status === 200 && Array.isArray(categories.data?.categories));

  const settings = await req('/api/settings');
  check('GET /api/settings → 200', settings.status === 200 && typeof settings.data?.settings?.businessName === 'string');
  check('settings never expose secrets', !/password|secret|jwt/i.test(JSON.stringify(settings.data)));
  check(
    'WhatsApp template is exposed for order generation',
    typeof settings.data?.settings?.whatsappTemplate === 'string' &&
      typeof settings.data?.settings?.whatsappSingleProductTemplate === 'string'
  );

  const reviews = await req('/api/reviews');
  check('GET /api/reviews → approved only', reviews.status === 200 && (reviews.data?.reviews ?? []).every((r) => r.status === 'approved'));

  const gallery = await req('/api/gallery');
  check('GET /api/gallery → active only', gallery.status === 200 && (gallery.data?.items ?? []).every((i) => i.active === true));

  const evt = await req('/api/analytics/events', {
    method: 'POST',
    body: { type: 'page_view', path: '/shop', productSlug: '', referrer: 'https://instagram.com', sessionId: 'smoke' },
  });
  check('POST /api/analytics/events → 202', evt.status === 202);

  const badEvent = await req('/api/analytics/events', { method: 'POST', body: { type: 'not_a_type' } });
  check('rejects invalid analytics event → 400', badEvent.status === 400);

  const unknownProduct = await req('/api/products/definitely-not-a-real-slug');
  check('unknown product → 404', unknownProduct.status === 404);

  const unknownCategory = await req('/api/categories/definitely-not-a-real-slug');
  check('unknown category → 404', unknownCategory.status === 404);

  // ── Authorization ────────────────────────────────────────────
  console.log('\nSecurity / authorization');
  check('admin route without token → 401', (await req('/api/admin/products')).status === 401);
  check('admin route with garbage token → 401', (await req('/api/admin/products', { token: 'not-a-real-token' })).status === 401);
  check('analytics requires auth', (await req('/api/admin/analytics')).status === 401);
  check('settings update requires auth', (await req('/api/admin/settings', { method: 'PUT', body: {} })).status === 401);
  check('product delete requires auth', (await req('/api/admin/products/000000000000000000000000', { method: 'DELETE' })).status === 401);

  const badLogin = await req('/api/admin/auth/login', { method: 'POST', body: { email: EMAIL, password: 'wrong-password-xyz' } });
  check('wrong password → 401', badLogin.status === 401);
  check('login error is generic (no account enumeration)', /invalid email or password/i.test(badLogin.data?.error ?? ''));
  check('login validation → 400', (await req('/api/admin/auth/login', { method: 'POST', body: { email: 'nope', password: 'x' } })).status === 400);

  // ── Admin login ──────────────────────────────────────────────
  console.log('\nAdmin authentication');
  const login = await tryLogin();
  check('valid credentials → token', Boolean(login.token));
  const token = login.token;
  if (!token) throw new Error('Cannot continue without an admin token — check ADMIN_EMAIL / ADMIN_PASSWORD.');

  const me = await req('/api/admin/auth/me', { token });
  check('GET /api/admin/auth/me → identity', me.status === 200 && me.data?.admin?.email === EMAIL.toLowerCase());

  // ── First-login password rotation (bootstrap admins) ─────────
  if (me.data?.admin?.mustChangePassword) {
    console.log('Bootstrap account detected — clearing the first-login password-change flag for this run…');

    // While the flag is set, the panel is locked: a normal admin route must refuse.
    check(
      'mustChangePassword blocks admin routes → 403',
      (await req('/api/admin/products', { token })).status === 403
    );
    check(
      'mustChangePassword blocks settings writes → 403',
      (await req('/api/admin/settings', { method: 'PUT', token, body: {} })).status === 403
    );

    const rotate = await req('/api/admin/auth/password', {
      method: 'PUT',
      token,
      body: { currentPassword: usingRotated ? ROTATED : PASSWORD, newPassword: ROTATED },
    });
    check('first-login password rotation succeeds → 200', rotate.status === 200);
    check('rotation response no longer reports mustChangePassword', rotate.data?.admin?.mustChangePassword === false);
    usingRotated = true;

    const meAfter = await req('/api/admin/auth/me', { token });
    check('flag cleared in /auth/me after rotation', meAfter.data?.admin?.mustChangePassword === false);

    check(
      'admin routes work again after rotation',
      (await req('/api/admin/products', { token })).status === 200
    );
  }

  // ── Category CRUD ────────────────────────────────────────────
  console.log('\nCategory CRUD');
  const newCat = await req('/api/admin/categories', {
    method: 'POST',
    token,
    body: { name: `${MARK} Category`, description: 'automated check', image: '', displayOrder: 500 },
  });
  check('POST category → 201', newCat.status === 201 && Boolean(newCat.data?.category?._id));
  const cid = newCat.data?.category?._id;
  if (cid) created.categories.push(cid);

  check('category slug auto-generated', newCat.data?.category?.slug === 'smoke-test-category');
  check(
    'duplicate category slug → 409',
    (await req('/api/admin/categories', { method: 'POST', token, body: { name: `${MARK} Category dup`, slug: 'smoke-test-category', description: '', image: '', displayOrder: 0 } })).status === 409
  );

  if (cid) {
    const updCat = await req(`/api/admin/categories/${cid}`, {
      method: 'PUT',
      token,
      body: { ...newCat.data.category, name: `${MARK} Category (updated)` },
    });
    check('PUT category → updated', updCat.status === 200 && updCat.data?.category?.name.includes('updated'));
    check(
      'PUT category reorder endpoint → ok',
      (await req('/api/admin/categories/reorder', { method: 'PUT', token, body: { items: [{ id: cid, displayOrder: 501 }] } })).status === 200
    );
    check(
      'category appears in public list',
      (await req('/api/categories')).data?.categories?.some((c) => c._id === cid) === true
    );
  }

  // ── Product CRUD ─────────────────────────────────────────────
  console.log('\nProduct CRUD');
  const created1 = await req('/api/admin/products', { method: 'POST', token, body: productPayload({ category: cid ?? null }) });
  check('POST product → 201', created1.status === 201 && Boolean(created1.data?.product?._id), JSON.stringify(created1.data)?.slice(0, 120));
  const pid = created1.data?.product?._id;
  if (pid) created.products.push(pid);

  if (pid) {
    const fetched = await req(`/api/admin/products/${pid}`, { token });
    const p = fetched.data?.product;
    check('GET product → created record', fetched.status === 200 && p?.price === 123);
    check('variants persisted (2)', p?.variants?.length === 2);
    check('variant pricing persisted', p?.variants?.[0]?.price === 123 && p?.variants?.[1]?.price === 199);
    check('variant stock status persisted', p?.variants?.[1]?.stockStatus === 'out_of_stock');
    check('ingredients persisted', p?.ingredients?.[0]?.includes(MARK));
    check('benefits persisted', p?.benefits?.[0]?.includes(MARK));
    check('SEO fields persisted', p?.seoTitle?.includes(MARK) && p?.seoDescription?.includes(MARK));
    check('bestseller flag persisted', p?.bestseller === true);

    check(
      'duplicate product slug → 409',
      (await req('/api/admin/products', { method: 'POST', token, body: productPayload({ name: `${MARK} dup` }) })).status === 409
    );
    check('missing product name → 400', (await req('/api/admin/products', { method: 'POST', token, body: { name: '' } })).status === 400);
    check(
      'invalid price type → 400',
      (await req('/api/admin/products', { method: 'POST', token, body: productPayload({ slug: 'x1', price: 'abc' }) })).status === 400
    );

    check(
      'public listing shows the product while in stock',
      (await req('/api/products')).data?.products?.some((x) => x._id === pid) === true
    );
    check('public product detail by slug → 200', (await req(`/api/products/${p.slug}`)).status === 200);
    check('related products endpoint → 200', (await req(`/api/products/${p.slug}/related`)).status === 200);

    const updated = await req(`/api/admin/products/${pid}`, {
      method: 'PUT',
      token,
      body: { ...p, name: `${MARK} Product (updated)`, price: 200, category: cid ?? null },
    });
    check('PUT product → updated', updated.status === 200 && updated.data?.product?.name.includes('updated'));

    // Out-of-stock products stay visible to customers but cannot be ordered.
    const oos = await req(`/api/admin/products/${pid}`, {
      method: 'PUT',
      token,
      body: { ...p, stockStatus: 'out_of_stock', category: cid ?? null },
    });
    check('PUT product → out of stock saved', oos.status === 200 && oos.data?.product?.stockStatus === 'out_of_stock');
    const publicOos = (await req('/api/products')).data?.products?.find((x) => x._id === pid);
    check('out-of-stock product remains visible publicly', Boolean(publicOos));
    check('out-of-stock product is flagged for the UI', publicOos?.stockStatus === 'out_of_stock');

    check('POST archive → archived:true', (await req(`/api/admin/products/${pid}/archive`, { method: 'POST', token })).data?.product?.archived === true);
    check('archived product hidden from public API', (await req(`/api/products/${p.slug}`)).status === 404);
    check('POST restore → archived:false', (await req(`/api/admin/products/${pid}/restore`, { method: 'POST', token })).data?.product?.archived === false);
  }

  // ── Review moderation ────────────────────────────────────────
  console.log('\nReview CRUD & moderation');
  const newRev = await req('/api/admin/reviews', {
    method: 'POST',
    token,
    body: { customerName: `${MARK} Customer`, rating: 4, text: `${MARK} automated check`, image: '', status: 'pending', displayOrder: 900 },
  });
  check('POST review → 201', newRev.status === 201 && Boolean(newRev.data?.review?._id));
  const rid = newRev.data?.review?._id;
  if (rid) created.reviews.push(rid);

  check('invalid rating (9) → 400', (await req('/api/admin/reviews', { method: 'POST', token, body: { customerName: 'x', rating: 9, text: 'y' } })).status === 400);

  if (rid) {
    check('pending review hidden publicly', !(await req('/api/reviews')).data?.reviews?.some((r) => r._id === rid));
    const approved = await req(`/api/admin/reviews/${rid}/status`, { method: 'POST', token, body: { status: 'approved' } });
    check('approve review → approved', approved.status === 200 && approved.data?.review?.status === 'approved');
    check('approved review visible publicly', (await req('/api/reviews')).data?.reviews?.some((r) => r._id === rid) === true);
    const hidden = await req(`/api/admin/reviews/${rid}/status`, { method: 'POST', token, body: { status: 'hidden' } });
    check('hide review → hidden', hidden.status === 200 && hidden.data?.review?.status === 'hidden');
    check('hidden review not public', !(await req('/api/reviews')).data?.reviews?.some((r) => r._id === rid));
    const updRev = await req(`/api/admin/reviews/${rid}`, { method: 'PUT', token, body: { ...approved.data.review, text: `${MARK} edited` } });
    check('PUT review → updated', updRev.status === 200 && updRev.data?.review?.text.includes('edited'));
    check(
      'invalid review status → 400',
      (await req(`/api/admin/reviews/${rid}/status`, { method: 'POST', token, body: { status: 'nonsense' } })).status === 400
    );
  }

  // ── Gallery CRUD ─────────────────────────────────────────────
  console.log('\nGallery CRUD');
  const newItem = await req('/api/admin/gallery', {
    method: 'POST',
    token,
    body: { image: 'https://example.com/smoke-test.jpg', caption: `${MARK} item`, externalUrl: '', displayOrder: 900, active: false },
  });
  check('POST gallery item → 201', newItem.status === 201 && Boolean(newItem.data?.item?._id));
  const gid = newItem.data?.item?._id;
  if (gid) created.gallery.push(gid);

  if (gid) {
    check('inactive item hidden publicly', !(await req('/api/gallery')).data?.items?.some((i) => i._id === gid));
    const activated = await req(`/api/admin/gallery/${gid}`, { method: 'PUT', token, body: { ...newItem.data.item, active: true } });
    check('PUT gallery → activated', activated.status === 200 && activated.data?.item?.active === true);
    check('active item visible publicly', (await req('/api/gallery')).data?.items?.some((i) => i._id === gid) === true);
  }

  // ── Analytics & settings ─────────────────────────────────────
  console.log('\nAnalytics & settings');
  const analytics = await req('/api/admin/analytics?range=30', { token });
  check('GET analytics → totals', analytics.status === 200 && typeof analytics.data?.totals?.pageViews === 'number');
  check('analytics recorded our page view', (analytics.data?.totals?.pageViews ?? 0) > 0);
  check('analytics reports top paths', Array.isArray(analytics.data?.topPaths));
  check('analytics range filter accepted (7/90)', (await req('/api/admin/analytics?range=7', { token })).status === 200 && (await req('/api/admin/analytics?range=90', { token })).status === 200);

  const getSettings = await req('/api/admin/settings', { token });
  check('GET admin settings → 200', getSettings.status === 200);
  check('invalid WhatsApp number → 400', (await req('/api/admin/settings', { method: 'PUT', token, body: { whatsappNumber: 'not-a-number!' } })).status === 400);
  check('invalid Instagram URL → 400', (await req('/api/admin/settings', { method: 'PUT', token, body: { instagramUrl: 'not-a-url' } })).status === 400);

  const originalSettings = getSettings.data?.settings ?? {};
  const updSettings = await req('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { ...originalSettings, announcements: { enabled: true, text: `${MARK} notice` } },
  });
  check('PUT settings → saved', updSettings.status === 200 && updSettings.data?.settings?.announcements?.enabled === true);

  // Restore the real settings so the test leaves no trace.
  await req('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { ...originalSettings, announcements: originalSettings.announcements ?? { enabled: false, text: '' } },
  });

  if (token) await cleanup(token);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${passed} checks passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
  console.log('API smoke test passed.\n');
}

main().catch(async (err) => {
  console.error('\nSmoke test crashed:', err.message);
  // Best-effort cleanup so a crash never leaves test data behind.
  try {
    const { token } = await tryLogin();
    if (token) await cleanup(token);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
