import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import type { AnalyticsSummary } from '@/types';

function StatCard({ label, value, hint, to }: { label: string; value: string | number; hint?: string; to?: string }) {
  const body = (
    <div className="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const products = useApi(() => adminApi.listProducts().then((r) => r.products), []);
  const categories = useApi(() => adminApi.listCategories().then((r) => r.categories), []);
  const reviews = useApi(() => adminApi.listReviews().then((r) => r.reviews), []);
  const analytics = useApi(() => adminApi.getAnalytics(range), [range]);

  const summary: AnalyticsSummary | null = analytics.data;
  const outOfStock = products.data?.filter((p) => p.stockStatus === 'out_of_stock' && !p.archived) ?? [];
  const pendingReviews = reviews.data?.filter((r) => r.status === 'pending') ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">Business overview and customer activity</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Analytics date range">
          {(['7', '30', '90'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                range === r ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft hover:bg-brand-50'
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </header>

      {/* Catalogue stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Catalogue summary">
        <StatCard label="Products" value={products.data?.filter((p) => !p.archived).length ?? '…'} to="/admin/products" />
        <StatCard label="Categories" value={categories.data?.length ?? '…'} to="/admin/categories" />
        <StatCard label="Out of stock" value={outOfStock.length} to="/admin/products" />
        <StatCard
          label="Reviews pending"
          value={pendingReviews.length}
          hint={pendingReviews.length ? 'Needs moderation' : 'All moderated'}
          to="/admin/reviews"
        />
      </section>

      {/* Analytics */}
      <section aria-label="Analytics" className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Customer activity ({range} days)</h2>
          {analytics.loading ? <span className="text-xs text-ink-soft">Loading…</span> : null}
        </div>

        {analytics.error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{analytics.error}</p>
        ) : summary ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: 'Page views', value: summary.totals.pageViews },
                { label: 'Product views', value: summary.totals.productViews },
                { label: 'WhatsApp clicks', value: summary.totals.whatsappClicks },
                { label: 'Add to cart', value: summary.totals.cartAdds },
                { label: 'Order via WA', value: summary.totals.orderWhatsappClicks },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-stone-50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <TopList title="Most viewed products" items={summary.topProducts.map((t) => ({ label: t._id, count: t.count }))} emptyText="No product views yet" />
              <TopList title="Top pages" items={summary.topPaths.map((t) => ({ label: t._id, count: t.count }))} emptyText="No traffic yet" />
              <TopList title="Top referrers" items={summary.topReferrers.map((t) => ({ label: t._id || '(direct)', count: t.count }))} emptyText="No referrer data yet" />
            </div>
          </>
        ) : null}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="flex flex-wrap gap-3">
        <Link to="/admin/products/new" className="btn-primary !py-2.5 text-sm">+ Add product</Link>
        <Link to="/admin/categories" className="btn-outline !py-2.5 text-sm">Manage categories</Link>
        <Link to="/admin/reviews" className="btn-outline !py-2.5 text-sm">Moderate reviews</Link>
        <Link to="/admin/settings" className="btn-outline !py-2.5 text-sm">Site settings</Link>
      </section>
    </div>
  );
}

function TopList({ title, items, emptyText }: { title: string; items: Array<{ label: string; count: number }>; emptyText: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft/70">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.slice(0, 5).map((it) => (
            <li key={it.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-ink">{it.label}</span>
              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
