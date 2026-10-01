/**
 * One-off import of the FIRST client-provided catalogue batch.
 *
 * Provenance: product names and prices below were supplied directly by the
 * client (verified list). Nothing else is inferred — descriptions, sizes,
 * ingredients, benefits, claims, photos and categories are intentionally left
 * for the admin panel, and every product is created `archived: true`
 * (= unpublished / hidden from the public API) until the client reviews it.
 *
 * Safety rules:
 *   • Never overwrite or delete anything: existing products are skipped.
 *   • Only images whose files actually exist in server/uploads are attached.
 *   • Contact details are written only into empty settings fields.
 *   • Products the client listed without a confirmed price are NOT created.
 *
 * Usage:
 *   npx tsx src/seed/import-client-catalogue.ts            (from server/)
 *   npx tsx src/seed/import-client-catalogue.ts --dry-run
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import { config } from '../config/env.js';
import { Product, SiteSettings } from '../models/index.js';
import { uploadsDir } from '../middleware/upload.js';

type ConfirmedProduct = {
  name: string;
  slug: string;
  price: number;
  /** File names inside server/uploads (already mapped & reviewed). */
  images: string[];
  bestseller?: boolean;
};

// Order = the order the client listed them in.
const CONFIRMED: ConfirmedProduct[] = [
  { name: 'Kojic Acid Fairness Soap', slug: 'kojic-acid-fairness-soap', price: 199, images: [] },
  {
    name: 'Bridal Fairness Cream',
    slug: 'bridal-fairness-cream',
    price: 699,
    images: ['bridal-fairness-cream-label.jpg'],
  },
  {
    name: 'Night Fairness Cream',
    slug: 'night-fairness-cream',
    price: 399,
    images: ['night-fairness-cream-label.jpg'],
  },
  { name: 'Skin Boost Serum', slug: 'skin-boost-serum', price: 199, images: [] },
  {
    name: 'Herbal Hair Oil',
    slug: 'herbal-hair-oil',
    price: 249,
    // The client identified Herbal Hair Oil as a popular product.
    bestseller: true,
    images: ['herbal-hair-oil-front.jpg', 'herbal-hair-oil-back.jpg'],
  },
];

// Client-confirmed business contact details (write only into empty fields).
const CONTACT = {
  email: 'shaikhparveenismail@gmail.com',
  whatsappNumber: '+919321639713',
};

const dryRun = process.argv.includes('--dry-run');

function existingImages(files: string[]): string[] {
  return files
    .filter((file) => {
      const exists = existsSync(path.join(uploadsDir, file));
      if (!exists) console.warn(`  ! image missing, skipped: ${file}`);
      return exists;
    })
    .map((file) => `${config.uploadsUrlPrefix}/${file}`);
}

async function main(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  console.log(`[import] ${dryRun ? 'DRY RUN — no writes. ' : ''}DB: ${mongoose.connection.name}`);

  let created = 0;
  let skipped = 0;

  for (const [index, item] of CONFIRMED.entries()) {
    const existing = await Product.findOne({ slug: item.slug });
    if (existing) {
      console.log(`• skip (already exists): ${item.slug} — "${existing.name}"`);
      skipped++;
      continue;
    }

    const images = existingImages(item.images);
    const payload = {
      name: item.name,
      slug: item.slug,
      price: item.price,
      images,
      bestseller: item.bestseller ?? false,
      displayOrder: index + 1,
      // Unpublished until the client reviews the catalogue in /admin.
      archived: true,
    };

    console.log(
      `+ create (unpublished): ${item.name} — ₹${item.price}` +
        `${images.length ? ` — ${images.length} photo(s)` : ' — no photo mapped'}` +
        `${item.bestseller ? ' — bestseller' : ''}`
    );
    if (!dryRun) await Product.create(payload);
    created++;
  }

  const settings = await SiteSettings.findOne();
  if (!settings) {
    console.warn('! No SiteSettings document found — run the seed first; contact details not written.');
  } else {
    const updates: string[] = [];
    if (!settings.email) {
      settings.email = CONTACT.email;
      updates.push(`email → ${CONTACT.email}`);
    }
    if (!settings.whatsappNumber) {
      settings.whatsappNumber = CONTACT.whatsappNumber;
      updates.push(`whatsappNumber → ${CONTACT.whatsappNumber}`);
    }
    if (updates.length) {
      console.log(`+ settings: ${updates.join('; ')}`);
      if (!dryRun) await settings.save();
    } else {
      console.log('• settings already have contact details — left untouched');
    }
  }

  console.log(
    `[import] done — ${created} product(s) ${dryRun ? 'to create' : 'created'}, ${skipped} skipped (existing).`
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[import] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
