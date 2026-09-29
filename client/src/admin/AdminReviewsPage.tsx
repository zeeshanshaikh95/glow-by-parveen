import { useState } from 'react';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { Stars } from '@/components/Stars';
import type { Review } from '@/types';

interface EditorState {
  id: string | null;
  customerName: string;
  rating: number;
  text: string;
  image: string;
  status: Review['status'];
  displayOrder: string;
}

const EMPTY: EditorState = {
  id: null,
  customerName: '',
  rating: 5,
  text: '',
  image: '',
  status: 'approved',
  displayOrder: '0',
};

export function AdminReviewsPage() {
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listReviews().then((r) => r.reviews),
    []
  );
  const { toast } = useToast();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const reviews = data ?? [];
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  async function save() {
    if (!editor) return;
    if (!editor.customerName.trim() || !editor.text.trim()) {
      toast('Customer name and review text are required', 'error');
      return;
    }
    setBusy(true);
    const payload = {
      customerName: editor.customerName.trim(),
      rating: editor.rating,
      text: editor.text.trim(),
      image: editor.image,
      status: editor.status,
      displayOrder: Number(editor.displayOrder) || 0,
    };
    try {
      if (editor.id) {
        await adminApi.updateReview(editor.id, payload);
        toast('Review updated');
      } else {
        await adminApi.createReview(payload);
        toast('Review added');
      }
      setEditor(null);
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(r: Review, status: Review['status']) {
    try {
      await adminApi.setReviewStatus(r._id, status);
      toast(status === 'approved' ? 'Review approved' : 'Review hidden');
      refetch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  }

  async function doDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminApi.deleteReview(deleting._id);
      toast('Review deleted');
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
          <h1 className="font-display text-2xl font-bold text-ink">Reviews</h1>
          <p className="text-sm text-ink-soft">
            {reviews.length} total{pendingCount > 0 ? ` · ${pendingCount} pending moderation` : ' · all moderated'}
          </p>
        </div>
        <button type="button" onClick={() => setEditor({ ...EMPTY })} className="btn-primary !py-2.5 text-sm">
          + Add review
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold">No reviews yet</p>
          <p className="mt-1 text-sm text-ink-soft">Add approved testimonials from real customers only.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r._id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className={`badge ${r.status === 'approved' ? 'bg-leaf-100 text-leaf-700' : r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <blockquote className="mt-2 text-sm leading-relaxed text-ink">“{r.text}”</blockquote>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    — {r.customerName} · {formatDate(r.createdAt)}
                    {r.image ? ' · has photo' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.status !== 'approved' ? (
                    <button type="button" onClick={() => setStatus(r, 'approved')} className="rounded-lg bg-leaf-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf-700">
                      Approve
                    </button>
                  ) : (
                    <button type="button" onClick={() => setStatus(r, 'hidden')} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold hover:bg-stone-50">
                      Hide
                    </button>
                  )}
                  <button type="button" onClick={() => setEditor({
                    id: r._id,
                    customerName: r.customerName,
                    rating: r.rating,
                    text: r.text,
                    image: r.image,
                    status: r.status,
                    displayOrder: String(r.displayOrder),
                  })} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleting(r)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Editor modal */}
      {editor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Review editor">
          <div className="absolute inset-0 bg-ink/40" onClick={() => !busy && setEditor(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-up">
            <h2 className="font-display text-xl font-bold">{editor.id ? 'Edit review' : 'Add review'}</h2>
            <p className="mt-1 text-xs text-ink-soft">Only add reviews from real, approved customers.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="r-name" className="label">Customer name *</label>
                <input id="r-name" className="input" value={editor.customerName}
                  onChange={(e) => setEditor((s) => s && { ...s, customerName: e.target.value })} />
              </div>
              <div>
                <span className="label">Rating</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setEditor((s) => s && { ...s, rating: n })}
                      className={`text-2xl leading-none transition-colors ${n <= editor.rating ? 'text-amber-400' : 'text-stone-200'}`}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={n <= editor.rating}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="r-text" className="label">Review text *</label>
                <textarea id="r-text" rows={4} className="input" value={editor.text}
                  onChange={(e) => setEditor((s) => s && { ...s, text: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="r-img" className="label">Customer photo URL (optional)</label>
                  <input id="r-img" type="url" className="input" value={editor.image}
                    onChange={(e) => setEditor((s) => s && { ...s, image: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="r-status" className="label">Status</label>
                  <select id="r-status" className="input" value={editor.status}
                    onChange={(e) => setEditor((s) => s && { ...s, status: e.target.value as Review['status'] })}>
                    <option value="approved">Approved (visible)</option>
                    <option value="pending">Pending</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="r-order" className="label">Display order</label>
                <input id="r-order" type="number" min="0" className="input !w-32" value={editor.displayOrder}
                  onChange={(e) => setEditor((s) => s && { ...s, displayOrder: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-ghost !py-2.5 text-sm">Cancel</button>
              <button type="button" onClick={save} disabled={busy} className="btn-primary !py-2.5 text-sm">
                {busy ? 'Saving…' : editor.id ? 'Save changes' : 'Add review'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete review?"
        message={`The review from “${deleting?.customerName}” will be permanently deleted.`}
        confirmLabel="Delete review"
        destructive
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={doDelete}
      />
    </div>
  );
}
