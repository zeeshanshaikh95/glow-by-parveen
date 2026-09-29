import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type ProductInput } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { slugifyLocal } from './slugify';
import { ImageManager } from './ImageManager';
import type { Product } from '@/types';

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  price: string;
  compareAtPrice: string;
  size: string;
  category: string;
  images: string[];
  ingredients: string;
  benefits: string;
  howToUse: string;
  warnings: string;
  variants: Array<{ name: string; price: string; stockStatus: 'in_stock' | 'out_of_stock' }>;
  stockStatus: 'in_stock' | 'out_of_stock';
  bestseller: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  archived: boolean;
};

const EMPTY: FormState = {
  name: '',
  slug: '',
  slugTouched: false,
  description: '',
  price: '',
  compareAtPrice: '',
  size: '',
  category: '',
  images: [],
  ingredients: '',
  benefits: '',
  howToUse: '',
  warnings: '',
  variants: [],
  stockStatus: 'in_stock',
  bestseller: false,
  featured: false,
  seoTitle: '',
  seoDescription: '',
  displayOrder: '0',
  archived: false,
};

function fromProduct(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    description: p.description,
    price: p.price === null ? '' : String(p.price),
    compareAtPrice: p.compareAtPrice === null ? '' : String(p.compareAtPrice),
    size: p.size,
    category: p.category ? String((p.category as { _id?: string })._id ?? '') : '',
    images: p.images,
    ingredients: p.ingredients.join('\n'),
    benefits: p.benefits.join('\n'),
    howToUse: p.howToUse,
    warnings: p.warnings,
    variants: p.variants.map((v) => ({
      name: v.name,
      price: v.price === null ? '' : String(v.price),
      stockStatus: v.stockStatus,
    })),
    stockStatus: p.stockStatus,
    bestseller: p.bestseller,
    featured: p.featured,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    displayOrder: String(p.displayOrder),
    archived: p.archived,
  };
}

function toInput(s: FormState): ProductInput {
  const price = s.price.trim() === '' ? null : Number(s.price);
  return {
    name: s.name.trim(),
    slug: s.slug.trim(),
    description: s.description,
    price: price !== null && Number.isFinite(price) ? price : null,
    compareAtPrice:
      s.compareAtPrice.trim() === '' || !Number.isFinite(Number(s.compareAtPrice))
        ? null
        : Number(s.compareAtPrice),
    size: s.size.trim(),
    category: s.category || null,
    images: s.images,
    ingredients: s.ingredients.split('\n').map((l) => l.trim()).filter(Boolean),
    benefits: s.benefits.split('\n').map((l) => l.trim()).filter(Boolean),
    howToUse: s.howToUse,
    warnings: s.warnings,
    variants: s.variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        price: v.price.trim() === '' || !Number.isFinite(Number(v.price)) ? null : Number(v.price),
        stockStatus: v.stockStatus,
      })),
    stockStatus: s.stockStatus,
    bestseller: s.bestseller,
    featured: s.featured,
    seoTitle: s.seoTitle.trim(),
    seoDescription: s.seoDescription.trim(),
    displayOrder: Number(s.displayOrder) || 0,
    archived: s.archived,
  };
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = useApi(() => adminApi.listCategories().then((r) => r.categories), []);
  const existing = useApi(
    () => (id ? adminApi.getProduct(id).then((r) => r.product) : Promise.resolve(null)),
    [id]
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existing.data && !loaded) {
      setForm(fromProduct(existing.data));
      setLoaded(true);
    }
  }, [existing.data, loaded]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const effectiveSlug = useMemo(
    () => (form.slugTouched ? form.slug : slugifyLocal(form.name)),
    [form.slug, form.slugTouched, form.name]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Product name is required' });
      return;
    }

    const input = { ...toInput(form), slug: effectiveSlug };
    setSaving(true);
    try {
      if (isEdit && id) {
        await adminApi.updateProduct(id, input);
        toast('Product saved');
      } else {
        await adminApi.createProduct(input);
        toast('Product created');
      }
      navigate('/admin/products');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      const details = (err as { details?: Record<string, string> }).details;
      if (details) setFieldErrors(details);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) {
    return <div className="skeleton h-96" />;
  }
  if (isEdit && existing.error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{existing.error}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">
          {isEdit ? 'Edit product' : 'New product'}
        </h1>
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost !py-2 text-sm">
          ← Back
        </button>
      </header>

      {/* Basics */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Basics</h2>

        <div>
          <label htmlFor="p-name" className="label">Name *</label>
          <input id="p-name" className="input" value={form.name}
            onChange={(e) => set('name', e.target.value)} />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="p-slug" className="label">Slug (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-soft">/product/</span>
            <input id="p-slug" className="input" value={effectiveSlug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugTouched: true }))} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">Leave as suggested — it's generated from the name.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-price" className="label">Price (₹) — leave empty for “Price on request”</label>
            <input id="p-price" type="number" min="0" step="0.01" className="input" value={form.price}
              onChange={(e) => set('price', e.target.value)} />
            {fieldErrors.price && <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>}
          </div>
          <div>
            <label htmlFor="p-compare" className="label">Compare-at price (optional)</label>
            <input id="p-compare" type="number" min="0" step="0.01" className="input" value={form.compareAtPrice}
              onChange={(e) => set('compareAtPrice', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="p-size" className="label">Quantity / Size</label>
            <input id="p-size" className="input" placeholder="e.g. 100 g" value={form.size}
              onChange={(e) => set('size', e.target.value)} />
          </div>
          <div>
            <label htmlFor="p-category" className="label">Category</label>
            <select id="p-category" className="input" value={form.category}
              onChange={(e) => set('category', e.target.value)}>
              <option value="">— None —</option>
              {categories.data?.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-order" className="label">Display order</label>
            <input id="p-order" type="number" min="0" className="input" value={form.displayOrder}
              onChange={(e) => set('displayOrder', e.target.value)} />
          </div>
        </div>

        <div>
          <label htmlFor="p-desc" className="label">Description</label>
          <textarea id="p-desc" rows={4} className="input" value={form.description}
            onChange={(e) => set('description', e.target.value)} />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Images</h2>
        <ImageManager images={form.images} onChange={(imgs) => set('images', imgs)} />
      </section>

      {/* Details */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Details</h2>

        <div>
          <label htmlFor="p-ing" className="label">Ingredients — one per line</label>
          <textarea id="p-ing" rows={4} className="input" value={form.ingredients}
            onChange={(e) => set('ingredients', e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-ben" className="label">Benefits / Uses — one per line</label>
          <textarea id="p-ben" rows={4} className="input" value={form.benefits}
            onChange={(e) => set('benefits', e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-how" className="label">How to use</label>
          <textarea id="p-how" rows={3} className="input" value={form.howToUse}
            onChange={(e) => set('howToUse', e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-warn" className="label">Warnings / Notes (optional)</label>
          <textarea id="p-warn" rows={2} className="input" value={form.warnings}
            onChange={(e) => set('warnings', e.target.value)} />
        </div>
      </section>

      {/* Variants & stock */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Variants & stock</h2>

        <div>
          <label htmlFor="p-stock" className="label">Stock status</label>
          <select id="p-stock" className="input !w-56" value={form.stockStatus}
            onChange={(e) => set('stockStatus', e.target.value as FormState['stockStatus'])}>
            <option value="in_stock">In stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">Variants (size packs, scents, etc.)</span>
            <button type="button" onClick={() => setForm((f) => ({
              ...f,
              variants: [...f.variants, { name: '', price: '', stockStatus: 'in_stock' }],
            }))} className="btn-ghost !px-2 !py-1 text-xs">+ Add variant</button>
          </div>

          {form.variants.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-stone-200 p-3 text-center text-xs text-ink-soft">
              No variants — the main price applies.
            </p>
          ) : (
            <ul className="space-y-2">
              {form.variants.map((v, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
                  <input className="input !w-40 !py-1.5 text-sm" placeholder="Name (e.g. 50 g)"
                    value={v.name}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) => ii === i ? { ...vv, name: e.target.value } : vv),
                    }))} />
                  <input className="input !w-28 !py-1.5 text-sm" type="number" min="0" step="0.01" placeholder="₹ price"
                    value={v.price}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) => ii === i ? { ...vv, price: e.target.value } : vv),
                    }))} />
                  <select className="input !w-36 !py-1.5 text-sm" value={v.stockStatus}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      variants: f.variants.map((vv, ii) => ii === i ? { ...vv, stockStatus: e.target.value as 'in_stock' | 'out_of_stock' } : vv),
                    }))}>
                    <option value="in_stock">In stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                  <button type="button"
                    onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, ii) => ii !== i) }))}
                    className="ml-auto rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Visibility */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Visibility</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand-600" checked={form.bestseller}
              onChange={(e) => set('bestseller', e.target.checked)} />
            Bestseller
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand-600" checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand-600" checked={form.archived}
              onChange={(e) => set('archived', e.target.checked)} />
            Archived (hidden from site)
          </label>
        </div>
      </section>

      {/* SEO */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">SEO</h2>
        <div>
          <label htmlFor="p-seot" className="label">SEO title</label>
          <input id="p-seot" className="input" maxLength={200} value={form.seoTitle}
            onChange={(e) => set('seoTitle', e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-seod" className="label">SEO description</label>
          <textarea id="p-seod" rows={2} className="input" maxLength={320} value={form.seoDescription}
            onChange={(e) => set('seoDescription', e.target.value)} />
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-ghost !py-2.5 text-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary !py-2.5 text-sm">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
