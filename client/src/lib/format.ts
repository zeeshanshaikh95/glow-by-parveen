export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Price on request';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatPriceShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Safe placeholder art when no image exists — deterministic per name. */
export function placeholderGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const palettes = [
    'from-brand-100 to-brand-200',
    'from-blush to-brand-100',
    'from-leaf-50 to-brand-100',
    'from-brand-50 to-leaf-100',
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
