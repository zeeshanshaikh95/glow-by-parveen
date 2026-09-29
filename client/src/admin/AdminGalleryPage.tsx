import { useState } from 'react';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageManager } from './ImageManager';
import { PlaceholderImage } from '@/components/PlaceholderImage';
import type { GalleryItem } from '@/types';

interface EditorState {
  id: string | null;
  image: string;
  caption: string;
  externalUrl: string;
  displayOrder: string;
  active: boolean;
}

const EMPTY: EditorState = {
  id: null,
  image: '',
  caption: '',
  externalUrl: '',
  displayOrder: '0',
  active: true,
};

export function AdminGalleryPage() {
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listGallery().then((r) => r.items),
    []
  );
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [busy, setBusy] = useState(false);

  const items = [...(data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  async function save() {
    if (!editor) return;
    if (!editor.image.trim()) {
      toast('Add an image first', 'error');
      return;
    }
    setBusy(true);
    const payload = {
      image: editor.image.trim(),
      caption: editor.caption.trim(),
      externalUrl: editor.externalUrl.trim(),
      displayOrder: Number(editor.displayOrder) || 0,
      active: editor.active,
    };
    try {
      if (editor.id) {
        await adminApi.updateGalleryItem(editor.id, payload);
        toast('Gallery item updated');
      } else {
        await adminApi.createGalleryItem(payload);
        toast('Gallery item added');
      }
      setEditor(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: GalleryItem) {
    try {
      await adminApi.updateGalleryItem(item._id, {
        image: item.image,
        caption: item.caption,
        externalUrl: item.externalUrl,
        displayOrder: item.displayOrder,
        active: !item.active,
      });
      toast(item.active ? 'Item hidden from gallery' : 'Item shown in gallery');
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  }

  async function doDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminApi.deleteGalleryItem(deleting._id);
      toast('Gallery item deleted');
      setDeleting(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Instagram Gallery</h1>
          <p className="text-sm text-ink-soft">
            Manually curated content — no live feed. {items.filter((i) => i.active).length} active
          </p>
        </div>
        <button type="button" onClick={() => setEditor({ ...EMPTY })} className="btn-primary !py-2.5 text-sm">
          + Add gallery item
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton aspect-square" />)}</div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold">No gallery items yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add images from the client's Instagram with links back to the original posts.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((g) => (
            <li key={g._id} className={`overflow-hidden rounded-2xl bg-white shadow-sm ${g.active ? '' : 'opacity-50'}`}>
              <div className="relative aspect-square bg-brand-50">
                {g.image ? (
                  <img src={g.image} alt={g.caption || 'Gallery item'} className="h-full w-full object-cover" />
                ) : (
                  <PlaceholderImage seed={`g-${g._id}`} label="No image" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium text-ink">{g.caption || '(no caption)'}</p>
                <p className="mt-0.5 text-[10px] text-ink-soft">order {g.displayOrder} · {g.active ? 'active' : 'hidden'}</p>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" onClick={() => toggleActive(g)} className="flex-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold hover:bg-stone-50">
                    {g.active ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => setEditor({
                    id: g._id,
                    image: g.image,
                    caption: g.caption,
                    externalUrl: g.externalUrl,
                    displayOrder: String(g.displayOrder),
                    active: g.active,
                  })} className="flex-1 rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-700">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleting(g)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50" aria-label="Delete item">
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Gallery editor">
          <div className="absolute inset-0 bg-ink/40" onClick={() => !busy && setEditor(null)} />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-fade-up">
            <h2 className="font-display text-xl font-bold">{editor.id ? 'Edit item' : 'New gallery item'}</h2>

            <div className="mt-5 space-y-4">
              <div>
                <span className="label">Image *</span>
                <ImageManager
                  images={editor.image ? [editor.image] : []}
                  onChange={(imgs) => setEditor((s) => s && { ...s, image: imgs[imgs.length - 1] ?? '' })}
                />
              </div>
              <div>
                <label htmlFor="g-caption" className="label">Caption</label>
                <input id="g-caption" className="input" value={editor.caption}
                  onChange={(e) => setEditor((s) => s && { ...s, caption: e.target.value })} />
              </div>
              <div>
                <label htmlFor="g-url" className="label">Instagram post URL (optional)</label>
                <input id="g-url" type="url" className="input" placeholder="https://www.instagram.com/p/…"
                  value={editor.externalUrl}
                  onChange={(e) => setEditor((s) => s && { ...s, externalUrl: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="g-order" className="label">Display order</label>
                  <input id="g-order" type="number" min="0" className="input" value={editor.displayOrder}
                    onChange={(e) => setEditor((s) => s && { ...s, displayOrder: e.target.value })} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="accent-brand-600" checked={editor.active}
                      onChange={(e) => setEditor((s) => s && { ...s, active: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-ghost !py-2.5 text-sm">Cancel</button>
              <button type="button" onClick={save} disabled={busy} className="btn-primary !py-2.5 text-sm">
                {busy ? 'Saving…' : editor.id ? 'Save changes' : 'Add item'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete gallery item?"
        message="This item will be permanently removed from the gallery."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}
