import { Category, GalleryItem, MediaAsset, Product, Review, SiteSettings } from '../models/index.js';
import { config } from '../config/env.js';
import {
  destroyAsset,
  isCloudinaryUrl,
  publicIdFromUrl,
  redactCloudinarySecrets,
  type CloudinaryUploadResult,
} from './cloudinaryService.js';

/**
 * Media library bookkeeping.
 *
 * The catalogue keeps storing plain `secure_url` strings (existing schema), so
 * this module answers the two questions the Cloudinary integration needs:
 *  1. which `public_id` belongs to a stored URL (registry first, URL parse as a
 *     fallback for assets uploaded before the registry existed), and
 *  2. is that asset still referenced by *any* document? An asset is only ever
 *     destroyed when nothing in the database points at it, which is what makes
 *     "delete the old image on replace" safe across shared images.
 */

export interface UploadedImage {
  /** Cloudinary secure_url — this is what gets stored in content documents. */
  url: string;
  /** Cloudinary public_id — stored next to the URL for later lifecycle ops. */
  publicId: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

/** Persists an upload in the registry and returns the client-facing payload. */
export async function recordUpload(
  result: CloudinaryUploadResult,
  uploadedBy: string | null
): Promise<UploadedImage> {
  const update: Record<string, unknown> = {
    secureUrl: result.secureUrl,
    publicId: result.publicId,
    provider: 'cloudinary',
    folder: config.cloudinary.folder,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
  if (uploadedBy) update.uploadedBy = uploadedBy;

  await MediaAsset.findOneAndUpdate(
    { publicId: result.publicId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    url: result.secureUrl,
    publicId: result.publicId,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/** Registry lookup with a parse fallback (pre-registry / manually pasted URLs). */
export async function publicIdForUrl(url: string): Promise<string | null> {
  const trimmed = url?.trim();
  if (!trimmed || !isCloudinaryUrl(trimmed)) return null;

  const asset = await MediaAsset.findOne({ secureUrl: trimmed }).select('publicId').lean();
  if (asset?.publicId) return asset.publicId;

  return publicIdFromUrl(trimmed);
}

/** Registry lookup by public_id → stored secure_url. */
export async function urlForPublicId(publicId: string): Promise<string | null> {
  const trimmed = publicId?.trim();
  if (!trimmed) return null;
  const asset = await MediaAsset.findOne({ publicId: trimmed }).select('secureUrl').lean();
  return asset?.secureUrl ?? null;
}

/** Same as {@link publicIdForUrl}, for a list — unknown URLs yield ''. */
export async function publicIdsForUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(async (url) => (await publicIdForUrl(url)) ?? ''));
}

interface ReferenceMatch {
  referenced: boolean;
  referencedBy: string[];
}

/**
 * Collects every image URL currently stored anywhere in the database.
 * `distinct` keeps this a single cheap round-trip per collection — the
 * catalogue is small and this only runs on replace/delete.
 */
async function collectReferencedUrls(): Promise<string[]> {
  const [productImages, categoryImages, reviewImages, galleryImages, settingsDocs] =
    await Promise.all([
      Product.distinct<string>('images'),
      Category.distinct<string>('image'),
      Review.distinct<string>('image'),
      GalleryItem.distinct<string>('image'),
      SiteSettings.find().select('hero.imageUrl about.founderImageUrl').lean(),
    ]);

  const raw: unknown[] = [
    ...productImages,
    ...categoryImages,
    ...reviewImages,
    ...galleryImages,
  ];
  for (const doc of settingsDocs) {
    if (doc.hero?.imageUrl) raw.push(doc.hero.imageUrl);
    if (doc.about?.founderImageUrl) raw.push(doc.about.founderImageUrl);
  }
  return raw.map((u) => String(u).trim()).filter(Boolean);
}

/**
 * Is this asset still in use? Matches on the exact stored URL first, then on
 * public_id (covers the same asset referenced through a transformed URL).
 */
export async function findReferences(url: string, publicId: string | null): Promise<ReferenceMatch> {
  const target = url.trim();
  const urls = await collectReferencedUrls();
  const referencedBy: string[] = [];

  for (const candidate of urls) {
    if (candidate === target) {
      referencedBy.push(candidate);
      continue;
    }
    if (publicId) {
      const candidatePublicId = isCloudinaryUrl(candidate) ? publicIdFromUrl(candidate) : null;
      if (candidatePublicId && candidatePublicId === publicId) referencedBy.push(candidate);
    }
  }

  return { referenced: referencedBy.length > 0, referencedBy: [...new Set(referencedBy)] };
}

export type ReleaseReason =
  | 'deleted'
  | 'not_found'
  | 'still_referenced'
  | 'not_a_cloudinary_asset'
  | 'unable_to_resolve_public_id'
  | 'failed';

export interface ReleaseResult {
  url: string;
  released: boolean;
  reason: ReleaseReason;
}

/**
 * Destroys a Cloudinary asset **only** when no document references it any more.
 * Legacy `/uploads/...` files and third-party URLs are never touched.
 */
export async function releaseUnusedImage(url: string): Promise<ReleaseResult> {
  const trimmed = url?.trim();
  if (!trimmed || !isCloudinaryUrl(trimmed)) {
    return { url: trimmed, released: false, reason: 'not_a_cloudinary_asset' };
  }

  const publicId = await publicIdForUrl(trimmed);
  if (!publicId) {
    return { url: trimmed, released: false, reason: 'unable_to_resolve_public_id' };
  }

  const references = await findReferences(trimmed, publicId);
  if (references.referenced) {
    return { url: trimmed, released: false, reason: 'still_referenced' };
  }

  const outcome = await destroyAsset(publicId);
  await MediaAsset.deleteOne({ publicId });
  return { url: trimmed, released: true, reason: outcome === 'deleted' ? 'deleted' : 'not_found' };
}

/**
 * Best-effort sweep for images that were removed from a document. Never throws:
 * a cleanup failure must not fail the admin's save — it only logs (redacted).
 */
export async function releaseUnusedImages(urls: string[]): Promise<ReleaseResult[]> {
  const unique = [...new Set(urls.map((u) => u?.trim()).filter(Boolean))];
  const results: ReleaseResult[] = [];
  for (const url of unique) {
    try {
      results.push(await releaseUnusedImage(url));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        '[media] cleanup skipped for',
        url,
        '-',
        redactCloudinarySecrets(message)
      );
      results.push({ url, released: false, reason: 'failed' });
    }
  }
  return results;
}

/** URLs present before but no longer present after an edit. */
export function removedUrls(before: string[] = [], after: string[] = []): string[] {
  const next = new Set(after.map((u) => u?.trim()).filter(Boolean));
  return [...new Set(before.map((u) => u?.trim()).filter(Boolean))].filter((u) => !next.has(u));
}
