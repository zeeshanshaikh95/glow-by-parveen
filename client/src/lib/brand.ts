/**
 * Brand assets derived from the client's official logo.
 * See scripts/brand-assets.mjs — the original file is never modified.
 *
 * All URLs honour Vite's BASE_URL so they resolve correctly both locally and
 * under a GitHub Pages sub-path.
 */
const BASE = import.meta.env.BASE_URL;

/** Official logo exactly as supplied by the client. */
export const LOGO_ORIGINAL = `${BASE}brand/glow-by-parveen-logo.png`;

/** Background removed — for light surfaces (navbar, footer, admin). */
export const LOGO_TRANSPARENT = `${BASE}brand/glow-by-parveen-logo-transparent.png`;

/** Background removed + empty padding trimmed — best for small spaces. */
export const LOGO_TRIMMED = `${BASE}brand/glow-by-parveen-logo-trimmed.png`;

/**
 * Homepage hero visual (1122×1402 — 4:5, matching the hero container exactly
 * so it fills without cropping). Client-supplied, so it ships from
 * client/public rather than the uploads folder.
 */
export const HERO_IMAGE = `${BASE}images/hero-skincare.png`;

/**
 * Founder portrait for the About page (1122×1402 — 4:5, matching the About
 * card so it fills without cropping the face). Client-supplied, so it ships
 * from client/public rather than the uploads folder.
 */
export const FOUNDER_IMAGE = `${BASE}images/founder-parveen.png`;

/** Social sharing image (1200×630). */
export const OG_IMAGE = `${BASE}og-image.png`;

/** Absolute URL of the social image, as crawlers require. */
export const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost:5173';
export const OG_IMAGE_ABSOLUTE = new URL(OG_IMAGE, SITE_URL).href;
