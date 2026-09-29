import { useState } from 'react';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { slugifyLocal } from './slugify';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageManager } from './ImageManager';
import { PlaceholderImage } from '@/components/PlaceholderImage';
import type { Category } from '@/types';

interface EditorState {
  id: string | null;
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  image: string;
  displayOrder: string;
}

const EMPTY: EditorState = {
  id: null,
  name: '',
  slug: '',
  slugTouched: false,
  description: '',
  image: '',
  displayOrder: '0',
};

export function AdminCategoriesPage() {
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listCategories().then((r) => r.categories),
    []
  );
  const { toast } = useToast();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [reordering, setReordering] = useState(false);

  const sorted = [...(data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  async function save() {
    if (!editor) return;
    if (!editor.name.trim()) {
      toast('Category name is required', 'error');
      return;
    }
    setBusy(true);
    const payload = {
      name: editor.name.trim(),
      slug: (editor.slugTouched ? editor.slug : slugifyLocal(editor.name)).trim(),
      description: editor.description,
      image: editor.image,
      displayOrder: Number(editor.displayOrder) || 0,
    };
    try {
      if (editor.id) {
        await adminApi.updateCategory(editor.id, payload);
        toast('Category updated');
      } else {
        await adminApi.createCategory(payload);
        toast('Category created');
      }
      setEditor(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminApi.deleteCategory(deleting._id);
      toast('Category deleted — its products are now uncategorised');
      setDeleting(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const list = [...sorted];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    setReordering(true);
    try {
      await adminApi.reorderCategories([
        { id: a._id, displayOrder: b.displayOrder },
        { id: b._id, displayOrder: a.displayOrder },
      ]);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reorder failed', 'error');
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Categories</h1>
          <p className="text-sm text-ink-soft">{sorted.length} categories · shown on the homepage</p>
        </div>
        <button type="button" onClick={() => setEditor({ ...EMPTY })} className="btn-primary !py-2.5 text-sm">
          + Add category
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold">No categories yet</p>
          <p className="mt-1 text-sm text-ink-soft">Categories help customers browse the shop.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((c, i) => (
            <li key={c._id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <PlaceholderImage seed={c.slug} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="truncate text-xs text-ink-soft">/{c.slug} · order {c.displayOrder}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || reordering} className="rounded-lg border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-40" aria-label={`Move ${c.name} up`}>↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === sorted.length - 1 || reordering} className="rounded-lg border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-40" aria-label={`Move ${c.name} down`}>↓</button>
                <button type="button" onClick={() => setEditor({
                  id: c._id,
                  name: c.name,
                  slug: c.slug,
                  slugTouched: true,
                  description: c.description,
                  image: c.image,
                  displayOrder: String(c.displayOrder),
                })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                  Edit
                </button>
                <button type="button" onClick={() => setDeleting(c)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Editor drawer */}
      {editor ? (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Category editor">
          <div className="absolute inset-0 bg-ink/40" onClick={() => !busy && setEditor(null)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editor.id ? 'Edit category' : 'New category'}</h2>
              <button type="button" onClick={() => setEditor(null)} className="rounded-full p-2 hover:bg-stone-100" aria-label="Close editor">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="c-name" className="label">Name *</label>
                <input id="c-name" className="input" value={editor.name}
                  onChange={(e) => setEditor((s) => s && { ...s, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-slug" className="label">Slug</label>
                <input id="c-slug" className="input"
                  value={editor.slugTouched ? editor.slug : slugifyLocal(editor.name)}
                  onChange={(e) => setEditor((s) => s && { ...s, slug: e.target.value, slugTouched: true })} />
              </div>
              <div>
                <label htmlFor="c-desc" className="label">Description</label>
                <textarea id="c-desc" rows={3} className="input" value={editor.description}
                  onChange={(e) => setEditor((s) => s && { ...s, description: e.target.value })} />
              </div>
              <div>
                <label htmlFor="c-order" className="label">Display order</label>
                <input id="c-order" type="number" min="0" className="input !w-32" value={editor.displayOrder}
                  onChange={(e) => setEditor((s) => s && { ...s, displayOrder: e.target.value })} />
              </div>
              <div>
                <span className="label">Category image</span>
                <ImageManager
                  images={editor.image ? [editor.image] : []}
                  onChange={(imgs) => setEditor((s) => s && { ...s, image: imgs[imgs.length - 1] ?? '' })}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-2">
              <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-ghost !py-2.5 text-sm">Cancel</button>
              <button type="button" onClick={save} disabled={busy} className="btn-primary !py-2.5 text-sm">
                {busy ? 'Saving…' : editor.id ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        message={`“${deleting?.name}” will be deleted. Products in this category are kept but become uncategorised.`}
        confirmLabel="Delete category"
        destructive
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}
