import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { formatPrice } from '@/lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { PlaceholderImage } from '@/components/PlaceholderImage';
import type { Product } from '@/types';

export function AdminProductsPage() {
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listProducts().then((r) => r.products),
    []
  );
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'archive'; product: Product } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const products = useMemo(() => {
    let list = data ?? [];
    if (!showArchived) list = list.filter((p) => !p.archived);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [data, search, showArchived]);

  async function doAction() {
    if (!confirm) return;
    setBusyId(confirm.product._id);
    try {
      if (confirm.kind === 'delete') {
        await adminApi.deleteProduct(confirm.product._id);
        toast('Product deleted');
      } else {
        await adminApi.archiveProduct(confirm.product._id);
        toast('Product archived');
      }
      setConfirm(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function restore(p: Product) {
    setBusyId(p._id);
    try {
      await adminApi.restoreProduct(p._id);
      toast('Product restored');
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Restore failed', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Products</h1>
          <p className="text-sm text-ink-soft">{products.length} shown</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary !py-2.5 text-sm">+ Add product</Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className="input !w-64"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-brand-600" />
          Show archived
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink">No products found</p>
          <p className="mt-1 text-sm text-ink-soft">Add your first product to get started.</p>
          <Link to="/admin/products/new" className="btn-primary mt-4 !py-2.5 text-sm">+ Add product</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Flags</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((p) => (
                <tr key={p._id} className={p.archived ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                        {p.images[0] ? (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <PlaceholderImage seed={p.slug} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{p.name}</p>
                        <p className="truncate text-xs text-ink-soft">/{p.slug}{p.variants.length ? ` · ${p.variants.length} variants` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.stockStatus === 'in_stock' ? 'bg-leaf-100 text-leaf-700' : 'bg-stone-100 text-stone-600'}`}>
                      {p.stockStatus === 'in_stock' ? 'In stock' : 'Out of stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.bestseller && <span className="badge-pink">Best</span>}
                      {p.featured && <span className="badge-leaf">Feat</span>}
                      {p.archived && <span className="badge-stone">Archived</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {p.archived ? (
                        <button type="button" onClick={() => restore(p)} disabled={busyId === p._id} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-stone-50">
                          Restore
                        </button>
                      ) : (
                        <button type="button" onClick={() => setConfirm({ kind: 'archive', product: p })} disabled={busyId === p._id} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-stone-50">
                          Archive
                        </button>
                      )}
                      <button type="button" onClick={() => setConfirm({ kind: 'delete', product: p })} disabled={busyId === p._id} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                      <Link to={`/admin/products/${p._id}`} className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'delete' ? 'Delete product permanently?' : 'Archive product?'}
        message={
          confirm?.kind === 'delete'
            ? `“${confirm.product.name}” will be permanently deleted. This cannot be undone. Consider archiving instead.`
            : `“${confirm?.product.name}” will be hidden from the site but kept in the catalogue.`
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Delete permanently' : 'Archive'}
        destructive={confirm?.kind === 'delete'}
        busy={Boolean(confirm && busyId === confirm.product._id)}
        onCancel={() => setConfirm(null)}
        onConfirm={doAction}
      />
    </div>
  );
}
