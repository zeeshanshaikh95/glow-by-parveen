import { useRef, useState } from 'react';
import { uploadImages } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { PlaceholderImage } from '@/components/PlaceholderImage';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * Multi-image manager used by products / categories / gallery.
 * Supports file upload (via the admin API) or pasting external image URLs
 * (e.g. Cloudinary) — flexible for free-tier deployments.
 */
export function ImageManager({ images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages(Array.from(files));
      onChange([...images, ...urls]);
      toast(`${urls.length} image${urls.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast('Enter a valid image URL', 'error');
      return;
    }
    onChange([...images, url]);
    setUrlInput('');
  }

  function removeAt(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-outline !py-2 text-xs"
        >
          {uploading ? 'Uploading…' : '⬆ Upload images'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-1 gap-1.5">
          <input
            type="url"
            className="input !py-2 text-xs"
            placeholder="…or paste an image URL (e.g. Cloudinary)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" onClick={addUrl} className="btn-ghost !px-3 !py-2 text-xs">
            Add
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-stone-200 p-4 text-center text-xs text-ink-soft">
          No images yet — the site shows a branded placeholder until one is added.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={`${img}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100">
              {img.startsWith('/uploads') || img.startsWith('http') ? (
                <img src={img} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <PlaceholderImage seed={img} label={img.slice(0, 20)} />
              )}
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/90 px-1.5 text-xs font-bold" aria-label="Move left" disabled={i === 0}>←</button>
                <button type="button" onClick={() => removeAt(i)} className="rounded bg-red-600/90 px-1.5 text-xs font-bold text-white" aria-label="Remove image">✕</button>
                <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/90 px-1.5 text-xs font-bold" aria-label="Move right" disabled={i === images.length - 1}>→</button>
              </div>
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Main</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
