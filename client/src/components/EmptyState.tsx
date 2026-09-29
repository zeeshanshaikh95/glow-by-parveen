import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: 'products' | 'search' | 'error';
}

export function EmptyState({ title, description, action, icon = 'products' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-blob border-2 border-dashed border-brand-200 bg-white/60 px-6 py-14 text-center">
      <svg viewBox="0 0 48 48" className="h-12 w-12 text-brand-300" fill="none" stroke="currentColor" strokeWidth="2">
        {icon === 'search' ? (
          <>
            <circle cx="21" cy="21" r="12" />
            <path d="M30 30l9 9" strokeLinecap="round" />
          </>
        ) : icon === 'error' ? (
          <>
            <circle cx="24" cy="24" r="16" />
            <path d="M24 16v10M24 31v1" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M24 12c-6 0-10 4-10 9 0 3-2 5-2 7h24c0-2-2-4-2-7 0-5-4-9-10-9z" />
            <path d="M20 32c0 2 1.8 4 4 4s4-2 4-4" strokeLinecap="round" />
          </>
        )}
      </svg>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-soft">{description}</p> : null}
      {action}
    </div>
  );
}
