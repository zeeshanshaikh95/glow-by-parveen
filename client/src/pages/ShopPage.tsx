import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/seo/Seo';
import { FloralDivider } from '@/components/FloralDivider';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured first' },
  { value: 'bestseller', label: 'Bestsellers first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
] as const;

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = (searchParams.get('sort') ?? 'featured') as string;

  const categories = useApi(() => publicApi.listCategories().then((r) => r.categories), []);

  const products = useApi(
    () => publicApi.listProducts({ search, category, sort: sort as never }).then((r) => r.products),
    [search, category, sort]
  );

  const [searchInput, setSearchInput] = useState(search);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const hasFilters = Boolean(search || category || (sort && sort !== 'featured'));

  return (
    <>
      <Seo
        title="Shop All Products"
        description="Browse the full Glow by Parveen catalogue of natural and herbal beauty products."
        canonicalPath="/shop"
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="text-center">
          <p className="eyebrow">The Collection</p>
          <h1 className="section-title mt-2">Shop All Products</h1>
          <FloralDivider className="mt-4" />
        </header>

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form
            role="search"
            className="relative w-full md:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              setParam('search', searchInput.trim());
            }}
          >
            <input
              type="search"
              className="input !pl-10"
              placeholder="Search products…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search products"
            />
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setParam('category', '')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                !category ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft hover:bg-brand-50'
              }`}
            >
              All
            </button>
            {categories.data?.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setParam('category', c.slug)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  category === c.slug ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft hover:bg-brand-50'
                }`}
              >
                {c.name}
              </button>
            ))}
            <select
              className="input !w-auto !py-2 text-xs"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {products.loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-72" />)}
            </div>
          ) : products.error ? (
            <EmptyState icon="error" title="Couldn't load products" description={products.error} action={<button className="btn-outline" onClick={() => products.refetch()}>Try again</button>} />
          ) : !products.data?.length ? (
            <EmptyState
              icon="search"
              title={hasFilters ? 'No products match your filters' : 'No products yet'}
              description={hasFilters ? 'Try a different search term or category.' : 'Products will appear here once added from the admin panel.'}
              action={hasFilters ? <button className="btn-outline" onClick={() => setSearchParams({})}>Clear filters</button> : undefined}
            />
          ) : (
            <>
              <p className="mb-4 text-xs text-ink-soft" aria-live="polite">
                {products.data.length} product{products.data.length === 1 ? '' : 's'}
                {search ? ` matching “${search}”` : ''}
              </p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {products.data.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
