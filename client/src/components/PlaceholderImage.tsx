import { placeholderGradient } from '@/lib/format';

interface Props {
  seed?: string;
  label?: string;
  className?: string;
}

/**
 * Brand-styled placeholder shown whenever real client imagery is not yet
 * available. Deliberately NOT stock photography (PRD §22 — real data policy).
 */
export function PlaceholderImage({ seed = 'glow', label, className = '' }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${placeholderGradient(seed)} ${className}`}
    >
      <svg viewBox="0 0 120 120" className="h-2/5 w-2/5 text-brand-400/70" fill="none">
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="60" cy="52" r="16" />
          <path d="M60 68c0 12-8 18-8 26M60 68c0 12 8 18 8 26M44 48c-7 2-11 8-11 14M76 48c7 2 11 8 11 14" />
          <path d="M30 96c14-6 46-6 60 0" />
        </g>
        <circle cx="60" cy="52" r="5" fill="currentColor" />
      </svg>
      {label ? (
        <span className="absolute bottom-2 left-0 right-0 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-brand-700/60">
          {label}
        </span>
      ) : null}
    </div>
  );
}
