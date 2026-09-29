/** Slugify consistent with the server's validation/schemas.ts slugify. */
export function slugifyLocal(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
