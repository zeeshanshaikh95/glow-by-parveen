interface Props {
  className?: string;
}

/** Subtle floral divider used between homepage sections (PRD §14: tasteful florals). */
export function FloralDivider({ className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center gap-3 text-brand-300 ${className}`} aria-hidden="true">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-brand-300" />
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        <path d="M12 9.5c0-3-2-4.5-4-4.5 0 3 2 4.5 4 4.5zM12 14.5c0 3 2 4.5 4 4.5 0-3-2-4.5-4-4.5zM9.5 12c-3 0-4.5 2-4.5 4 3 0 4.5-2 4.5-4zM14.5 12c3 0 4.5-2 4.5-4-3 0-4.5 2-4.5 4z" />
      </svg>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-brand-300" />
    </div>
  );
}
