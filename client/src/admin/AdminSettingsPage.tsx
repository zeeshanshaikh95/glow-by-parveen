import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '@/api/endpoints';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { ImageManager } from './ImageManager';
import type { AdminSettings } from '@/types';

export function AdminSettingsPage() {
  const { data, loading, error } = useApi(() => adminApi.getSettings(), []);
  const { toast } = useToast();
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await adminApi.updateSettings(form);
      toast('Settings saved');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    try {
      await adminApi.changePassword(pwCurrent, pwNew);
      toast('Password updated');
      setPwCurrent('');
      setPwNew('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Password change failed', 'error');
    } finally {
      setPwBusy(false);
    }
  }

  if (loading) return <div className="skeleton h-96" />;
  if (error || !form) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error ?? 'Settings not loaded'}</p>;

  function set<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Site Settings</h1>
        <p className="text-sm text-ink-soft">Business info, WhatsApp ordering, homepage content</p>
      </header>

      {/* Business */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Business & contact</h2>
        <div>
          <label htmlFor="s-name" className="label">Business name</label>
          <input id="s-name" className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
        </div>
        <div>
          <label htmlFor="s-wa" className="label">WhatsApp number (international format, digits only) *</label>
          <input id="s-wa" className="input" placeholder="e.g. 919876543210" value={form.whatsappNumber}
            onChange={(e) => set('whatsappNumber', e.target.value)} />
          <p className="mt-1 text-xs text-ink-soft">
            {form.whatsappNumber
              ? '✓ Set — WhatsApp ordering is live.'
              : '⚠ Not set — all "Order on WhatsApp" buttons are disabled until this is filled. [CLIENT DATA REQUIRED]'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="s-ig" className="label">Instagram URL</label>
            <input id="s-ig" type="url" className="input" placeholder="https://instagram.com/…" value={form.instagramUrl}
              onChange={(e) => set('instagramUrl', e.target.value)} />
          </div>
          <div>
            <label htmlFor="s-email" className="label">Email</label>
            <input id="s-email" type="email" className="input" value={form.email}
              onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label htmlFor="s-maps" className="label">Google Maps URL</label>
            <input id="s-maps" type="url" className="input" value={form.mapsUrl}
              onChange={(e) => set('mapsUrl', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Announcement */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Announcement bar</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-600" checked={form.announcements.enabled}
            onChange={(e) => set('announcements', { ...form.announcements, enabled: e.target.checked })} />
          Show announcement bar
        </label>
        <input className="input" placeholder="Announcement text…" maxLength={300} value={form.announcements.text}
          onChange={(e) => set('announcements', { ...form.announcements, text: e.target.value })} />
      </section>

      {/* Hero */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Homepage hero</h2>
        <div>
          <label htmlFor="s-hero-h" className="label">Headline</label>
          <input id="s-hero-h" className="input" value={form.hero.headline}
            onChange={(e) => set('hero', { ...form.hero, headline: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-hero-s" className="label">Subheadline</label>
          <textarea id="s-hero-s" rows={2} className="input" value={form.hero.subheadline}
            onChange={(e) => set('hero', { ...form.hero, subheadline: e.target.value })} />
        </div>
        <div>
          <span className="label">Hero image</span>
          <ImageManager images={form.hero.imageUrl ? [form.hero.imageUrl] : []}
            onChange={(imgs) => set('hero', { ...form.hero, imageUrl: imgs[imgs.length - 1] ?? '' })} />
        </div>
      </section>

      {/* About */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">About content</h2>
        <div>
          <label htmlFor="s-about-i" className="label">Short intro</label>
          <textarea id="s-about-i" rows={2} className="input" value={form.about.intro}
            onChange={(e) => set('about', { ...form.about, intro: e.target.value })} />
        </div>
        <div>
          <label htmlFor="s-about-s" className="label">Brand story (approved copy only)</label>
          <textarea id="s-about-s" rows={5} className="input" value={form.about.story}
            onChange={(e) => set('about', { ...form.about, story: e.target.value })} />
          {form.about.story === '[CLIENT DATA REQUIRED]' ? (
            <p className="mt-1 text-xs font-semibold text-brand-700">
              Placeholder active — awaiting approved client copy.
            </p>
          ) : null}
        </div>
        <div>
          <span className="label">Founder photo</span>
          <ImageManager images={form.about.founderImageUrl ? [form.about.founderImageUrl] : []}
            onChange={(imgs) => set('about', { ...form.about, founderImageUrl: imgs[imgs.length - 1] ?? '' })} />
        </div>
      </section>

      {/* WhatsApp templates */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">WhatsApp message templates</h2>
        <p className="text-xs leading-relaxed text-ink-soft">
          Placeholders — cart: <code className="rounded bg-stone-100 px-1">{'{{ITEMS}}'}</code>{' '}
          <code className="rounded bg-stone-100 px-1">{'{{TOTAL}}'}</code> · single product:{' '}
          <code className="rounded bg-stone-100 px-1">{'{{PRODUCT}}'}</code>{' '}
          <code className="rounded bg-stone-100 px-1">{'{{PRICE}}'}</code>{' '}
          <code className="rounded bg-stone-100 px-1">{'{{VARIANT_LINE}}'}</code>{' '}
          <code className="rounded bg-stone-100 px-1">{'{{QTY_LINE}}'}</code>
        </p>
        <div>
          <label htmlFor="s-tpl-cart" className="label">Cart / multi-product template</label>
          <textarea id="s-tpl-cart" rows={6} className="input font-mono text-xs" value={form.whatsappTemplate}
            onChange={(e) => set('whatsappTemplate', e.target.value)} />
        </div>
        <div>
          <label htmlFor="s-tpl-single" className="label">Single-product template</label>
          <textarea id="s-tpl-single" rows={6} className="input font-mono text-xs" value={form.whatsappSingleProductTemplate}
            onChange={(e) => set('whatsappSingleProductTemplate', e.target.value)} />
        </div>
      </section>

      <div className="flex justify-end pb-6">
        <button type="submit" disabled={saving} className="btn-primary !py-2.5 text-sm">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Security */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2" id="pw-form">
          <div>
            <label htmlFor="pw-cur" className="label">Current password</label>
            <input id="pw-cur" type="password" autoComplete="current-password" className="input" value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw-new" className="label">New password (min 8 chars)</label>
            <input id="pw-new" type="password" autoComplete="new-password" className="input" value={pwNew}
              onChange={(e) => setPwNew(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pwBusy || !pwCurrent || pwNew.length < 8} className="btn-outline !py-2.5 text-sm">
              {pwBusy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </form>
  );
}
