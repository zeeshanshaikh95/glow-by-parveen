/**
 * End-to-end API smoke test.
 *
 * Exercises the public endpoints, admin authentication/authorization and every
 * admin CRUD surface against a running API. Requires the database to be seeded.
 *
 *   node scripts/api-smoke.mjs                        (defaults to localhost:4000)
 *   API_URL=https://api.example.com node scripts/api-smoke.mjs
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/api-smoke.mjs
 *
 * Exits non-zero on the first failure so it can gate deployments.
 */
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@glowbyparveen.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'GlowDemo!2026';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(path, { method = 'GET', body, token, raw = false } = {}) {
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
  return { status: res.status, data, raw };
}

async function main() {
  console.log(`\nGlow by Parveen — API smoke test against ${API_URL}\n`);

  // ── Health & public reads ────────────────────────────────────
  console.log('Public endpoints');
  const health = await req('/api/health');
  check('GET /api/health → 200', health.status === 200 && health.data?.ok === true);

  const products = await req('/api/products');
  check('GET /api/products → list', products.status === 200 && Array.isArray(products.data?.products));
  check('products exclude archived', (products.data?.products ?? []).every((p) => p.archived === false));

  const categories = await req('/api/categories');
  check('GET /api/categories → list', categories.status === 200 && categories.data?.categories.length > 0);

  const settings = await req('/api/settings');
  check('GET /api/settings → 200', settings.status === 200 && typeof settings.data?.settings?.businessName === 'string');
  check('settings never expose secrets', !JSON.stringify(settings.data).match(/password|secret|jwt/i));

  const reviews = await req('/api/reviews');
  check('GET /api/reviews → approved only', reviews.status === 200 && (reviews.data?.reviews ?? []).every((r) => r.status === 'approved'));

  const gallery = await req('/api/gallery');
  check('GET /api/gallery → active only', gallery.status === 200 && (gallery.data?.items ?? []).every((i) => i.active === true));

  // Public analytics event
  const evt = await req('/api/analytics/events', {
    method: 'POST',
    body: { type: 'page_view', path: '/shop', productSlug: '', referrer: 'https://instagram.com', sessionId: 'smoke' },
  });
  check('POST /api/analytics/events → 202', evt.status === 202);

  const badEvent = await req('/api/analytics/events', { method: 'POST', body: { type: 'not_a_type' } });
  check('POST /api/analytics/events rejects invalid type', badEvent.status === 400);

  if (products.data?.products?.[0]) {
    const slug = products.data.products[0].slug;
    const one = await req(`/api/products/${encodeURIComponent(slug)}`);
    check('GET /api/products/:slug → 200', one.status === 200 && one.data?.product?.slug === slug);
    const related = await req(`/api/products/${encodeURIComponent(slug)}/related`);
    check('GET /api/products/:slug/related → 200', related.status === 200 && Array.isArray(related.data?.products));
    const missing = await req('/api/products/definitely-not-a-real-slug');
    check('GET unknown product → 404', missing.status === 404);
  }

  // ── Authorization ────────────────────────────────────────────
  console.log('\nSecurity / authorization');
  const noAuth = await req('/api/admin/products');
  check('admin route without token → 401', noAuth.status === 401);

  const badToken = await req('/api/admin/products', { token: 'not-a-real-token' });
  check('admin route with garbage token → 401', badToken.status === 401);

  const badLogin = await req('/api/admin/auth/login', { method: 'POST', body: { email: EMAIL, password: 'wrong-password-xyz' } });
  check('login with wrong password → 401', badLogin.status === 401);
  check('login error is generic (no account enumeration)', /invalid email or password/i.test(badLogin.data?.error ?? ''));

  const badBody = await req('/api/admin/auth/login', { method: 'POST', body: { email: 'not-an-email', password: 'x' } });
  check('login validation → 400', badBody.status === 400);

  // ── Admin login ──────────────────────────────────────────────
  console.log('\nAdmin authentication');
  const login = await req('/api/admin/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  check('login with valid credentials → token', login.status === 200 && typeof login.data?.token === 'string');
  const token = login.data?.token;
  if (!token) throw new Error('Cannot continue without an admin token — check ADMIN_EMAIL/ADMIN_PASSWORD.');

  const me = await req('/api/admin/auth/me', { token });
  check('GET /api/admin/auth/me → admin identity', me.status === 200 && me.data?.admin?.email === EMAIL.toLowerCase());

  // ── Product CRUD ─────────────────────────────────────────────
  console.log('\nProduct CRUD (using a clearly-marked smoke-test record)');
  const catId = categories.data?.categories?.[0]?._id ?? null;
  const created = await req('/api/admin/products', {
    method: 'POST',
    token,
    body: {
      name: '[SMOKE TEST] Product — delete me',
      description: '[SMOKE TEST] automated end-to-end check',
      price: 123,
      compareAtPrice: 150,
      size: '1 unit',
      category: catId,
      images: [],
      ingredients: ['[SMOKE TEST]'],
      benefits: ['[SMOKE TEST]'],
      howToUse: '[SMOKE TEST]',
      warnings: '',
      variants: [{ name: 'Variant A', price: 123, stockStatus: 'in_stock' }],
      stockStatus: 'in_stock',
      bestseller: true,
      featured: false,
      seoTitle: '[SMOKE TEST] SEO title',
      seoDescription: '[SMOKE TEST] SEO description',
      displayOrder: 999,
      archived: false,
    },
  });
  check('POST /api/admin/products → 201', created.status === 201 && Boolean(created.data?.product?._id), JSON.stringify(created.data)?.slice(0, 120));
  const pid = created.data?.product?._id;

  if (pid) {
    const fetched = await req(`/api/admin/products/${pid}`, { token });
    check('GET /api/admin/products/:id → created record', fetched.status === 200 && fetched.data?.product?.price === 123);
    check('variant persisted', fetched.data?.product?.variants?.[0]?.name === 'Variant A');

    const dupe = await req('/api/admin/products', {
      method: 'POST',
      token,
      body: { name: '[SMOKE TEST] duplicate slug', slug: created.data.product.slug, description: '', price: null, images: [] },
    });
    check('duplicate slug → 409', dupe.status === 409);

    const invalid = await req('/api/admin/products', { method: 'POST', token, body: { name: '' } });
    check('invalid product payload → 400', invalid.status === 400);

    const updated = await req(`/api/admin/products/${pid}`, {
      method: 'PUT',
      token,
      body: { ...fetched.data.product, name: '[SMOKE TEST] Product (updated)', price: 200, category: catId },
    });
    check('PUT /api/admin/products/:id → updated', updated.status === 200 && updated.data?.product?.name.includes('updated'));

    const archived = await req(`/api/admin/products/${pid}/archive`, { method: 'POST', token });
    check('POST archive → archived:true', archived.status === 200 && archived.data?.product?.archived === true);

    const publicAfterArchive = await req(`/api/products/${created.data.product.slug}`);
    check('archived product hidden from public API', publicAfterArchive.status === 404);

    const restored = await req(`/api/admin/products/${pid}/restore`, { method: 'POST', token });
    check('POST restore → archived:false', restored.status === 200 && restored.data?.product?.archived === false);

    const del = await req(`/api/admin/products/${pid}`, { method: 'DELETE', token });
    check('DELETE /api/admin/products/:id → ok', del.status === 200);
    const gone = await req(`/api/admin/products/${pid}`, { token });
    check('deleted product no longer found', gone.status === 404);
  }

  // ── Category CRUD ────────────────────────────────────────────
  console.log('\nCategory CRUD');
  const newCat = await req('/api/admin/categories', {
    method: 'POST',
    token,
    body: { name: '[SMOKE TEST] Category', description: 'automated check', image: '', displayOrder: 500 },
  });
  check('POST /api/admin/categories → 201', newCat.status === 201 && Boolean(newCat.data?.category?._id));
  const cid = newCat.data?.category?._id;

  if (cid) {
    check('category slug auto-generated', newCat.data.category.slug === 'smoke-test-category');
    const updCat = await req(`/api/admin/categories/${cid}`, {
      method: 'PUT',
      token,
      body: { ...newCat.data.category, name: '[SMOKE TEST] Category (updated)' },
    });
    check('PUT /api/admin/categories/:id → updated', updCat.status === 200 && updCat.data?.category?.name.includes('updated'));

    const reorder = await req('/api/admin/categories/reorder', {
      method: 'PUT',
      token,
      body: { items: [{ id: cid, displayOrder: 501 }] },
    });
    check('PUT /api/admin/categories/reorder → ok', reorder.status === 200);

    const delCat = await req(`/api/admin/categories/${cid}`, { method: 'DELETE', token });
    check('DELETE /api/admin/categories/:id → ok', delCat.status === 200);
  }

  // ── Review CRUD ──────────────────────────────────────────────
  console.log('\nReview CRUD & moderation');
  const newRev = await req('/api/admin/reviews', {
    method: 'POST',
    token,
    body: { customerName: '[SMOKE TEST] Customer', rating: 4, text: 'automated check', image: '', status: 'pending', displayOrder: 900 },
  });
  check('POST /api/admin/reviews → 201', newRev.status === 201 && Boolean(newRev.data?.review?._id));
  const rid = newRev.data?.review?._id;

  if (rid) {
    const publicBefore = await req('/api/reviews');
    check('pending review hidden publicly', !(publicBefore.data?.reviews ?? []).some((r) => r._id === rid));

    const approved = await req(`/api/admin/reviews/${rid}/status`, { method: 'POST', token, body: { status: 'approved' } });
    check('POST review status → approved', approved.status === 200 && approved.data?.review?.status === 'approved');

    const publicAfter = await req('/api/reviews');
    check('approved review visible publicly', (publicAfter.data?.reviews ?? []).some((r) => r._id === rid));

    const updRev = await req(`/api/admin/reviews/${rid}`, {
      method: 'PUT',
      token,
      body: { ...approved.data.review, text: 'automated check (edited)' },
    });
    check('PUT /api/admin/reviews/:id → updated', updRev.status === 200 && updRev.data?.review?.text.includes('edited'));

    const badRating = await req('/api/admin/reviews', { method: 'POST', token, body: { customerName: 'x', rating: 9, text: 'y' } });
    check('invalid rating → 400', badRating.status === 400);

    const delRev = await req(`/api/admin/reviews/${rid}`, { method: 'DELETE', token });
    check('DELETE /api/admin/reviews/:id → ok', delRev.status === 200);
  }

  // ── Gallery CRUD ─────────────────────────────────────────────
  console.log('\nGallery CRUD');
  const newItem = await req('/api/admin/gallery', {
    method: 'POST',
    token,
    body: { image: 'https://example.com/smoke-test.jpg', caption: '[SMOKE TEST] item', externalUrl: '', displayOrder: 900, active: false },
  });
  check('POST /api/admin/gallery → 201', newItem.status === 201 && Boolean(newItem.data?.item?._id));
  const gid = newItem.data?.item?._id;

  if (gid) {
    const publicGallery = await req('/api/gallery');
    check('inactive gallery item hidden publicly', !(publicGallery.data?.items ?? []).some((i) => i._id === gid));

    const updItem = await req(`/api/admin/gallery/${gid}`, {
      method: 'PUT',
      token,
      body: { ...newItem.data.item, active: true, caption: '[SMOKE TEST] visible' },
    });
    check('PUT /api/admin/gallery/:id → activated', updItem.status === 200 && updItem.data?.item?.active === true);

    const delItem = await req(`/api/admin/gallery/${gid}`, { method: 'DELETE', token });
    check('DELETE /api/admin/gallery/:id → ok', delItem.status === 200);
  }

  // ── Analytics & settings ─────────────────────────────────────
  console.log('\nAnalytics & settings');
  const analytics = await req('/api/admin/analytics?range=30', { token });
  check('GET /api/admin/analytics → totals', analytics.status === 200 && typeof analytics.data?.totals?.pageViews === 'number');
  check('analytics counts the page view we sent', (analytics.data?.totals?.pageViews ?? 0) > 0);
  check('analytics reports top paths', Array.isArray(analytics.data?.topPaths));

  const noAuthAnalytics = await req('/api/admin/analytics');
  check('analytics requires auth', noAuthAnalytics.status === 401);

  const getSettings = await req('/api/admin/settings', { token });
  check('GET /api/admin/settings → 200', getSettings.status === 200);

  const badSettings = await req('/api/admin/settings', { method: 'PUT', token, body: { whatsappNumber: 'not-a-number!' } });
  check('invalid settings payload → 400', badSettings.status === 400);

  const updSettings = await req('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { ...getSettings.data.settings, announcements: { enabled: true, text: '[SMOKE TEST] notice' } },
  });
  check('PUT /api/admin/settings → saved', updSettings.status === 200 && updSettings.data?.settings?.announcements?.enabled === true);

  // restore announcement state
  await req('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { ...getSettings.data.settings, announcements: getSettings.data.settings.announcements },
  });

  // ── Summary ──────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${passed} checks passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
  console.log('API smoke test passed.\n');
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err.message);
  process.exit(1);
});
