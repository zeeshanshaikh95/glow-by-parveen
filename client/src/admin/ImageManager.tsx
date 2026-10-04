import { useRef, useState } from 'react';
import {
  deleteUploadedImage,
  uploadImagesDetailed,
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_TYPES_LABEL,
} from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { PlaceholderImage } from '@/components/PlaceholderImage';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

const MAX_MB = Math.round(IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024));

/** Cloudinary delivery URLs are absolute, so they work unchanged on GitHub Pages. */
function isCloudinaryUrl(url: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\//i.test(url);
}

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Multi-image manager used by products / categories / gallery / site settings.
 * Files are uploaded through our own admin API (which validates them and stores
 * them in Cloudinary); external image URLs can still be pasted directly.
 */
export function ImageManager({ images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { toast } = useToast();

  /** Client-side pre-check — the API re-validates everything server-side. */
  function validate(files: File[]): { accepted: File[]; problems: string[] } {
    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of files) {
      const type = (file.type || '').toLowerCase();
      if (!IMAGE_UPLOAD_ACCEPT.split(',').includes(type)) {
        problems.push(`${file.name} — unsupported type (${type || 'unknown'}). Use ${IMAGE_UPLOAD_TYPES_LABEL}.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name} — the file is empty.`);
        continue;
      }
      if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
        problems.push(`${file.name} — ${humanSize(file.size)} exceeds the ${MAX_MB} MB limit.`);
        continue;
      }
      accepted.push(file);
    }
    return { accepted, problems };
  }

  function reportProblems(problems: string[]) {
    if (!problems.length) return;
    const shown = problems.slice(0, 3).join(' · ');
    toast(problems.length > 3 ? `${shown} · +${problems.length - 3} more` : shown, 'error');
  }

  async function uploadOne(file: File): Promise<string> {
    const [uploaded] = await uploadImagesDetailed([file]);
    if (!uploaded?.url) throw new Error('The server did not return an image URL');
    return uploaded.url;
  }

  async function onFiles(files: FileList | null) {
    const replaceAt = replaceIndexRef.current;
    replaceIndexRef.current = null;

    const selected = Array.from(files ?? []);
    if (!selected.length) return;

    const { accepted, problems } = validate(selected);
    reportProblems(problems);
    if (!accepted.length) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: accepted.length });
    const added: string[] = [];
    const failures: string[] = [];

    try {
      for (let i = 0; i < accepted.length; i++) {
        setProgress({ done: i, total: accepted.length });
        try {
          added.push(await uploadOne(accepted[i]));
        } catch (err) {
          failures.push(`${accepted[i].name} — ${err instanceof Error ? err.message : 'upload failed'}`);
        }
      }

      if (added.length && replaceAt !== null && added.length === 1) {
        // Replace in place so the slot (e.g. the "Main" image) keeps its position.
        const replaced = images[replaceAt] ?? '';
        onChange(images.map((current, index) => (index === replaceAt ? added[0] : current)));
        // Best-effort: the API keeps the old asset while any document still
        // references it, so a rejected cleanup simply means "still in use".
        if (replaced && isCloudinaryUrl(replaced)) {
          void deleteUploadedImage(replaced).catch(() => undefined);
        }
        toast('Image replaced');
      } else if (added.length) {
        onChange([...images, ...added]);
        toast(`${added.length} image${added.length === 1 ? '' : 's'} uploaded`);
      }

      if (failures.length) reportProblems(failures);
    } finally {
      setUploading(false);
      setProgress(null);
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
    const removed = images[i] ?? '';
    onChange(images.filter((_, idx) => idx !== i));
    if (removed && isCloudinaryUrl(removed)) {
      // Only ever deletes an unreferenced asset (the API answers 409 otherwise).
      void deleteUploadedImage(removed).catch(() => undefined);
    }
  }

  function startReplace(i: number) {
    if (uploading) return;
    replaceIndexRef.current = i;
    fileRef.current?.click();
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
          onClick={() => {
            replaceIndexRef.current = null;
            fileRef.current?.click();
          }}
          disabled={uploading}
          className="btn-outline !py-2 text-xs"
        >
          {uploading && progress
            ? `Uploading ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`
            : '⬆ Upload images'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          multiple
          hidden
          disabled={uploading}
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

      <p className="text-[11px] leading-relaxed text-ink-soft">
        {IMAGE_UPLOAD_TYPES_LABEL} · up to {MAX_MB} MB each · uploaded to Cloudinary by the API
        (admin login required).
      </p>

      {uploading ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-ink-soft">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Uploading… please keep this tab open.
        </div>
      ) : null}

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
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/90 px-1.5 text-xs font-bold" aria-label="Move left" disabled={i === 0}>←</button>
                <a
                  href={img}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-white/90 px-1.5 text-xs font-bold"
                  aria-label="Preview image in a new tab"
                  title="Preview"
                >
                  🔍
                </a>
                <button
                  type="button"
                  onClick={() => startReplace(i)}
                  className="rounded bg-white/90 px-1.5 text-xs font-bold"
                  aria-label="Replace image"
                  title="Replace"
                  disabled={uploading}
                >
                  ⟳
                </button>
                <button type="button" onClick={() => removeAt(i)} className="rounded bg-red-600/90 px-1.5 text-xs font-bold text-white" aria-label="Remove image">✕</button>
                <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/90 px-1.5 text-xs font-bold" aria-label="Move right" disabled={i === images.length - 1}>→</button>
              </div>
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Main</span>
              ) : null}
              {isCloudinaryUrl(img) ? (
                <span className="absolute right-1 top-1 rounded bg-white/85 px-1 py-0.5 text-[9px] font-semibold text-ink-soft" title="Stored in Cloudinary">
                  C
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
